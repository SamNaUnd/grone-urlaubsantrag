package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.AccountService.*;
import static de.grone.urlaubsantrag.ApiModels.*;
import static org.springframework.http.HttpStatus.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class InvitationService {
    private final InvitationRepository invitations;
    private final AccountService accounts;
    private final Clock clock;
    private final SecureRandom random=new SecureRandom();

    public InvitationService(InvitationRepository invitations,AccountService accounts,Clock clock) {
        this.invitations=invitations; this.accounts=accounts; this.clock=clock;
    }

    public List<InvitationView> list() {
        accounts.require(Role.ADMIN);
        return invitations.findAllByOrderByCreatedAtDesc().stream().map(this::view).toList();
    }

    @Transactional
    public CreatedInvitation create(CreateInvitation input) {
        var creator=accounts.require(Role.ADMIN);
        if (input.role()!=Role.TRAINEE && input.role()!=Role.INSTRUCTOR)
            throw error(BAD_REQUEST,"Einladungscodes sind nur für Ausbilder und Auszubildende vorgesehen.");
        if (input.role()==Role.TRAINEE) {
            if (input.instructorId()==null || input.trainingProgram()==null || input.trainingProgram().isBlank())
                throw error(BAD_REQUEST,"Für Auszubildende sind Ausbilder und Ausbildungsbereich erforderlich.");
            var instructor=accounts.user(input.instructorId());
            if (!instructor.active || instructor.role!=Role.INSTRUCTOR)
                throw error(BAD_REQUEST,"Wählen Sie einen aktiven Ausbilder.");
        }
        byte[] bytes=new byte[16]; random.nextBytes(bytes);
        String code=(input.role()==Role.INSTRUCTOR?"AB-":"AZ-")+HexFormat.of().formatHex(bytes).toUpperCase(Locale.ROOT);
        var invitation=new RegistrationInvitation(); invitation.codeHash=fingerprint(code);
        invitation.role=input.role(); invitation.createdById=creator.id; invitation.createdAt=clock.instant();
        invitation.expiresAt=clock.instant().plus(Duration.ofDays(input.validDays()));
        invitation.entitlementYear=input.year();
        invitation.entitlementDays=input.role()==Role.TRAINEE?input.days():0;
        invitation.instructorId=input.role()==Role.TRAINEE?input.instructorId():null;
        invitation.trainingProgram=input.role()==Role.TRAINEE?input.trainingProgram().strip():null;
        invitations.saveAndFlush(invitation);
        return new CreatedInvitation(view(invitation),code);
    }

    @Transactional
    public UserView register(RegistrationInput input) {
        var invitation=invitations.lockByCodeHash(fingerprint(input.code()))
                .orElseThrow(() -> invalidCode());
        if (invitation.redeemedAt!=null || invitation.revokedAt!=null || !invitation.expiresAt.isAfter(clock.instant()))
            throw invalidCode();
        var account=accounts.createAccount(new CreateUser(input.firstName(),input.lastName(),input.email(),
                input.password(),invitation.role,invitation.trainingProgram,invitation.instructorId,
                invitation.entitlementDays),invitation.entitlementYear);
        invitation.redeemedAt=clock.instant(); invitations.save(invitation);
        return accounts.view(account);
    }

    @Transactional
    public void revoke(Long id) {
        accounts.require(Role.ADMIN);
        var invitation=invitations.lockById(id).orElseThrow(() -> error(NOT_FOUND,"Einladung nicht gefunden."));
        if (invitation.redeemedAt!=null) throw error(CONFLICT,"Dieser Code wurde bereits verwendet.");
        invitation.revokedAt=clock.instant(); invitations.save(invitation);
    }

    private InvitationView view(RegistrationInvitation i) {
        return new InvitationView(i.id,i.role,i.trainingProgram,i.instructorId==null?null:name(accounts.user(i.instructorId)),
                i.entitlementYear,i.entitlementDays,i.createdAt,i.expiresAt,i.redeemedAt,i.revokedAt);
    }
    private static String fingerprint(String code) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(code.strip().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
    private static org.springframework.web.server.ResponseStatusException invalidCode() {
        return error(BAD_REQUEST,"Der Einladungscode ist ungültig, abgelaufen oder bereits verwendet.");
    }
}
