package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.AccountService.*;
import static de.grone.urlaubsantrag.ApiModels.*;
import static org.springframework.http.HttpStatus.*;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class LeaveService {
    private final AccountService accounts;
    private final TraineeRepository trainees;
    private final LeaveRepository requests;
    private final EntitlementRepository entitlements;
    private final ApprovalRepository approvals;
    private final HolidayService holidays;
    private final Clock clock;
    private final EntityManager entityManager;

    public LeaveService(AccountService accounts,TraineeRepository trainees,LeaveRepository requests,
            EntitlementRepository entitlements,ApprovalRepository approvals,HolidayService holidays,
            Clock clock,EntityManager entityManager) {
        this.accounts=accounts; this.trainees=trainees; this.requests=requests;
        this.entitlements=entitlements; this.approvals=approvals; this.holidays=holidays;
        this.clock=clock; this.entityManager=entityManager;
    }

    public List<RequestView> list() {
        var caller=accounts.current();
        var permitted=trainees.findAll().stream().filter(t -> visible(caller,t)).map(t -> t.id).toList();
        return requests.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> permitted.contains(r.traineeId)).map(this::view).toList();
    }

    public RequestView detail(Long id) {
        var request=request(id); accessible(trainee(request.traineeId)); return view(request);
    }

    public Balance balance(Long id,int year) {
        checkYear(year); accessible(trainee(id)); return calculateBalance(id,year);
    }

    Balance calculateBalance(Long traineeId,int year) {
        int allowance=entitlements.findByTraineeIdAndYear(traineeId,year).map(e -> e.days).orElse(0);
        int pending=0,taken=0,upcoming=0;
        for (var r:requests.findByTraineeIdOrderByCreatedAtDesc(traineeId)) {
            if (r.startDate.getYear()!=year) continue;
            if (r.status==LeaveStatus.OPEN) pending+=r.totalDays;
            if (r.status==LeaveStatus.APPROVED) {
                if (r.endDate.isBefore(LocalDate.now(clock))) taken+=r.totalDays;
                else upcoming+=r.totalDays;
            }
        }
        return new Balance(traineeId,year,allowance,taken,upcoming,pending,allowance-taken-upcoming-pending);
    }

    public Preview preview(LocalDate start,LocalDate end) {
        var caller=accounts.require(Role.TRAINEE);
        var t=trainees.findByUserId(caller.id).orElseThrow(() -> error(CONFLICT,"Ausbildungsprofil fehlt."));
        validateDates(start,end);
        return new Preview(holidays.workingDays(start,end,t.federalState),calculateBalance(t.id,start.getYear()));
    }

    @Transactional
    public RequestView create(RequestInput input) {
        var caller=accounts.require(Role.TRAINEE);
        validateDates(input.startDate(),input.endDate());
        var profile=trainees.findByUserId(caller.id).orElseThrow(() -> error(CONFLICT,"Ausbildungsprofil fehlt."));
        var t=lock(profile.id);
        var instructor=accounts.user(t.instructorId);
        if (!instructor.active || instructor.role!=Role.INSTRUCTOR)
            throw error(CONFLICT,"Der zugeordnete Ausbilder ist nicht verfügbar. Bitte Verwaltung kontaktieren.");
        int days=holidays.workingDays(input.startDate(),input.endDate(),t.federalState);
        if (days==0) throw error(UNPROCESSABLE_ENTITY,"Der Zeitraum enthält keine Urlaubstage.");
        var existing=requests.findByTraineeIdOrderByCreatedAtDesc(t.id);
        if (existing.stream().anyMatch(r -> (r.status==LeaveStatus.OPEN || r.status==LeaveStatus.APPROVED)
                && !r.endDate.isBefore(input.startDate()) && !r.startDate.isAfter(input.endDate())))
            throw error(CONFLICT,"Der Zeitraum überschneidet sich mit einem offenen oder genehmigten Antrag.");
        if (days>calculateBalance(t.id,input.startDate().getYear()).available())
            throw error(UNPROCESSABLE_ENTITY,"Das verfügbare Urlaubskontingent reicht nicht aus.");
        var r=new LeaveRequest(); r.traineeId=t.id; r.startDate=input.startDate(); r.endDate=input.endDate();
        r.totalDays=days; r.reason=input.reason()==null?"":input.reason().strip(); r.createdAt=clock.instant();
        return view(requests.saveAndFlush(r));
    }

    @Transactional
    public RequestView withdraw(Long id) {
        var caller=accounts.require(Role.TRAINEE);
        var r=request(id); var t=lock(r.traineeId); entityManager.refresh(r);
        if (!t.userId.equals(caller.id)) throw error(FORBIDDEN,"Dieser Antrag gehört einem anderen Benutzer.");
        requireOpen(r); r.status=LeaveStatus.WITHDRAWN;
        return view(requests.save(r));
    }

    @Transactional
    public RequestView decide(Long id,boolean approved,String comment) {
        var caller=accounts.require(Role.INSTRUCTOR);
        var r=request(id); var t=lock(r.traineeId); entityManager.refresh(r);
        if (!t.instructorId.equals(caller.id)) throw error(FORBIDDEN,"Dieser Antrag ist einem anderen Ausbilder zugeordnet.");
        requireOpen(r);
        String reason=comment==null?"":comment.strip();
        if (!approved && reason.isBlank()) throw error(BAD_REQUEST,"Bitte einen Ablehnungsgrund angeben.");
        if (approved && calculateBalance(t.id,r.startDate.getYear()).available()<0)
            throw error(CONFLICT,"Das Urlaubskontingent reicht nicht mehr aus.");
        r.status=approved?LeaveStatus.APPROVED:LeaveStatus.REJECTED;
        var a=new Approval(); a.leaveRequestId=r.id; a.approverId=caller.id;
        a.decision=r.status; a.comment=reason; a.decisionDate=clock.instant();
        approvals.saveAndFlush(a); requests.save(r);
        return view(r);
    }

    @Transactional
    public Balance setEntitlement(Long id,EntitlementInput input) {
        accounts.require(Role.ADMIN); checkYear(input.year()); lock(id);
        var current=calculateBalance(id,input.year());
        if (input.days()<current.taken()+current.approvedUpcoming()+current.pending())
            throw error(CONFLICT,"Das Kontingent darf nicht kleiner als bereits gebundene Urlaubstage sein.");
        var entitlement=entitlements.findByTraineeIdAndYear(id,input.year()).orElseGet(LeaveEntitlement::new);
        entitlement.traineeId=id; entitlement.year=input.year(); entitlement.days=input.days();
        entitlements.saveAndFlush(entitlement);
        return calculateBalance(id,input.year());
    }

    private RequestView view(LeaveRequest r) {
        var t=trainee(r.traineeId); var u=accounts.user(t.userId); var instructor=accounts.user(t.instructorId);
        var a=approvals.findByLeaveRequestId(r.id).orElse(null);
        return new RequestView(r.id,t.id,name(u),t.trainingProgram,name(instructor),r.startDate,r.endDate,
                r.totalDays,r.reason,r.status,r.createdAt,a==null?null:a.comment,
                a==null?null:name(accounts.user(a.approverId)),a==null?null:a.decisionDate);
    }

    private Trainee trainee(Long id) {
        return trainees.findById(id).orElseThrow(() -> error(NOT_FOUND,"Auszubildender nicht gefunden."));
    }
    private Trainee lock(Long id) {
        return trainees.lockById(id).orElseThrow(() -> error(NOT_FOUND,"Auszubildender nicht gefunden."));
    }
    private LeaveRequest request(Long id) {
        return requests.findById(id).orElseThrow(() -> error(NOT_FOUND,"Antrag nicht gefunden."));
    }
    private boolean visible(UserAccount user,Trainee t) {
        return user.role==Role.ADMIN || (user.role==Role.TRAINEE && t.userId.equals(user.id))
                || (user.role==Role.INSTRUCTOR && t.instructorId.equals(user.id));
    }
    private void accessible(Trainee t) {
        if (!visible(accounts.current(),t)) throw error(FORBIDDEN,"Keine Berechtigung für dieses Ausbildungsprofil.");
    }
    private void requireOpen(LeaveRequest r) {
        if (r.status!=LeaveStatus.OPEN) throw error(CONFLICT,"Nur offene Anträge können bearbeitet werden.");
    }
    private void validateDates(LocalDate start,LocalDate end) {
        if (start==null || end==null || end.isBefore(start)) throw error(BAD_REQUEST,"Bitte einen gültigen Zeitraum wählen.");
        if (start.isBefore(LocalDate.now(clock))) throw error(BAD_REQUEST,"Urlaub kann nicht rückwirkend beantragt werden.");
        if (start.getYear()!=end.getYear()) throw error(BAD_REQUEST,"Bitte pro Kalenderjahr einen eigenen Antrag erstellen.");
        checkYear(start.getYear());
    }
    private void checkYear(int year) {
        if (year<2020 || year>2100) throw error(BAD_REQUEST,"Das Jahr muss zwischen 2020 und 2100 liegen.");
    }
}
