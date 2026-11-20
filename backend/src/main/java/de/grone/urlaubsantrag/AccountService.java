package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.ApiModels.*;
import static org.springframework.http.HttpStatus.*;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class AccountService {
    private final UserRepository users;
    private final TraineeRepository trainees;
    private final EntitlementRepository entitlements;
    private final LeaveRepository requests;
    private final PasswordEncoder passwords;
    private final Clock clock;

    public AccountService(UserRepository users, TraineeRepository trainees, EntitlementRepository entitlements,
            LeaveRepository requests, PasswordEncoder passwords, Clock clock) {
        this.users=users; this.trainees=trainees; this.entitlements=entitlements;
        this.requests=requests; this.passwords=passwords; this.clock=clock;
    }

    public UserAccount current() {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if (authentication==null || !authentication.isAuthenticated()) throw error(UNAUTHORIZED,"Bitte anmelden.");
        var account=users.findByEmail(authentication.getName()).filter(u -> u.active)
                .orElseThrow(() -> error(UNAUTHORIZED,"Das Konto ist nicht verfügbar. Bitte neu anmelden."));
        var attributes=org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servlet) {
            var session=servlet.getRequest().getSession(false);
            if (session!=null && session.getAttribute("credentialsVersion") instanceof Integer version
                    && version!=account.credentialsVersion) {
                session.invalidate();
                throw error(UNAUTHORIZED,"Das Passwort wurde geändert. Bitte erneut anmelden.");
            }
        }
        return account;
    }

    public UserAccount require(Role role) {
        var user=current();
        if (user.role!=role) throw error(FORBIDDEN,"Für diese Aktion fehlt die Berechtigung.");
        return user;
    }

    public UserView me() { return view(current()); }

    public UserView view(UserAccount u) {
        var t=u.role==Role.TRAINEE?trainees.findByUserId(u.id).orElse(null):null;
        var instructor=t==null ? null : users.findById(t.instructorId).orElse(null);
        return new UserView(u.id,u.firstName,u.lastName,u.email,u.role,u.active,
                t==null?null:t.id,t==null?null:t.trainingProgram,t==null?null:t.instructorId,
                instructor==null?null:name(instructor),t==null?null:t.trainingLocation);
    }

    public List<UserView> listUsers() {
        require(Role.ADMIN);
        return users.findAllByOrderByLastNameAscFirstNameAsc().stream().map(this::view).toList();
    }

    public List<UserView> listTrainees() {
        var caller=current();
        return trainees.findAll().stream()
                .filter(t -> user(t.userId).role==Role.TRAINEE)
                .filter(t -> caller.role==Role.ADMIN || (caller.role==Role.INSTRUCTOR && t.instructorId.equals(caller.id))
                        || (caller.role==Role.TRAINEE && t.userId.equals(caller.id)))
                .map(t -> view(user(t.userId))).sorted(Comparator.comparing(UserView::lastName)).toList();
    }

    @Transactional
    public UserView create(CreateUser input) {
        require(Role.ADMIN);
        return view(createAccount(input));
    }

    UserAccount createAccount(CreateUser input) {
        return createAccount(input,java.time.LocalDate.now(clock).getYear());
    }

    UserAccount createAccount(CreateUser input,int entitlementYear) {
        var email=normalizeEmail(input.email());
        if (users.existsByEmail(email)) throw error(CONFLICT,"Diese E-Mail-Adresse wird bereits verwendet.");
        if (input.role()==Role.TRAINEE) validateInstructor(input.instructorId(),input.trainingProgram());
        var u=new UserAccount();
        u.firstName=input.firstName().strip(); u.lastName=input.lastName().strip();
        u.email=email; u.passwordHash=hash(input.password()); u.role=input.role(); u.createdAt=clock.instant();
        users.saveAndFlush(u);
        if (u.role==Role.TRAINEE) {
            var t=new Trainee(); t.userId=u.id; t.instructorId=input.instructorId();
            t.trainingProgram=input.trainingProgram().strip(); trainees.saveAndFlush(t);
            var entitlement=new LeaveEntitlement(); entitlement.traineeId=t.id;
            entitlement.year=entitlementYear; entitlement.days=input.entitlement();
            entitlements.save(entitlement);
        }
        return u;
    }

    @Transactional
    public UserView update(Long id, UpdateUser input) {
        var caller=require(Role.ADMIN);
        var u=user(id);
        if (caller.id.equals(id) && (!input.active() || input.role()!=Role.ADMIN))
            throw error(CONFLICT,"Das eigene Verwaltungskonto kann nicht deaktiviert oder herabgestuft werden.");
        var email=normalizeEmail(input.email());
        users.findByEmail(email).filter(existing -> !existing.id.equals(id)).ifPresent(existing -> {
            throw error(CONFLICT,"Diese E-Mail-Adresse wird bereits verwendet.");
        });
        if (u.role==Role.INSTRUCTOR && (input.role()!=Role.INSTRUCTOR || !input.active())
                && trainees.existsByInstructorId(id))
            throw error(CONFLICT,"Ordnen Sie zuerst die Auszubildenden einem anderen Ausbilder zu.");
        var t=trainees.findByUserId(id).orElse(null);
        if (t!=null) t=trainees.lockById(t.id).orElseThrow();
        if (t!=null && input.role()!=Role.TRAINEE && requests.existsByTraineeId(t.id))
            throw error(CONFLICT,"Die Rolle kann bei vorhandener Urlaubshistorie nicht geändert werden.");
        if (t!=null && input.role()!=Role.TRAINEE) {
            entitlements.deleteByTraineeId(t.id); entitlements.flush();
            trainees.delete(t); trainees.flush(); t=null;
        }
        if (input.role()==Role.TRAINEE) {
            validateInstructor(input.instructorId(),input.trainingProgram());
            if (t==null) { t=new Trainee(); t.userId=id; }
            t.instructorId=input.instructorId(); t.trainingProgram=input.trainingProgram().strip();
            trainees.save(t);
        }
        u.firstName=input.firstName().strip(); u.lastName=input.lastName().strip(); u.email=email;
        u.role=input.role(); u.active=input.active(); users.save(u);
        return view(u);
    }

    @Transactional
    public void changePassword(PasswordInput input) {
        var u=current();
        if (!passwords.matches(input.currentPassword(),u.passwordHash))
            throw error(BAD_REQUEST,"Das aktuelle Passwort ist falsch.");
        u.passwordHash=hash(input.newPassword()); u.credentialsVersion++; users.save(u);
    }

    @Transactional
    public void resetPassword(Long id, ResetPassword input) {
        require(Role.ADMIN);
        var u=user(id); u.passwordHash=hash(input.password()); u.credentialsVersion++; users.save(u);
    }

    UserAccount user(Long id) {
        return users.findById(id).orElseThrow(() -> error(NOT_FOUND,"Benutzer nicht gefunden."));
    }

    private void validateInstructor(Long id, String program) {
        if (program==null || program.isBlank() || id==null)
            throw error(BAD_REQUEST,"Ausbildungsbereich und Ausbilder sind erforderlich.");
        var instructor=user(id);
        if (instructor.role!=Role.INSTRUCTOR || !instructor.active)
            throw error(BAD_REQUEST,"Wählen Sie einen aktiven Ausbilder.");
    }

    private String hash(String password) {
        if (password==null || password.length()<12 || password.getBytes(StandardCharsets.UTF_8).length>72)
            throw error(BAD_REQUEST,"Das Passwort benötigt mindestens 12 Zeichen und höchstens 72 UTF-8-Bytes.");
        return passwords.encode(password);
    }

    static String name(UserAccount u) { return u.firstName+" "+u.lastName; }
    static String normalizeEmail(String email) { return email.strip().toLowerCase(Locale.ROOT); }
    static ResponseStatusException error(org.springframework.http.HttpStatus status,String message) {
        return new ResponseStatusException(status,message);
    }
}
