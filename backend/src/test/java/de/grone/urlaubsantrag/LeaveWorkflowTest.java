package de.grone.urlaubsantrag;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest
@ActiveProfiles("test")
class LeaveWorkflowTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired TraineeRepository trainees;
    @Autowired LeaveRepository requests;
    @Autowired EntitlementRepository entitlements;
    @Autowired ApprovalRepository approvals;
    @Autowired InvitationRepository invitations;
    @Autowired PasswordEncoder passwords;
    @MockitoBean HolidayService holidays;
    MockMvc mvc;
    Long traineeId,otherTraineeId;
    String start,end;

    @BeforeEach void prepare() {
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        invitations.deleteAll(); approvals.deleteAll(); requests.deleteAll(); entitlements.deleteAll(); trainees.deleteAll(); users.deleteAll();
        var instructor=account("instructor@example.test",Role.INSTRUCTOR);
        account("other-instructor@example.test",Role.INSTRUCTOR);
        account("admin@example.test",Role.ADMIN);
        var trainee=account("trainee@example.test",Role.TRAINEE);
        var other=account("other-trainee@example.test",Role.TRAINEE);
        traineeId=profile(trainee.id,instructor.id);
        otherTraineeId=profile(other.id,instructor.id);
        var date=LocalDate.now(ZoneId.of("Europe/Berlin")).plusDays(14);
        while (date.getDayOfWeek()!=DayOfWeek.MONDAY) date=date.plusDays(1);
        if (date.getYear()!=date.plusDays(4).getYear()) date=LocalDate.of(date.getYear()+1,1,11);
        start=date.toString(); end=date.plusDays(4).toString();
        allowance(traineeId,date.getYear(),30); allowance(otherTraineeId,date.getYear(),30);
        when(holidays.workingDays(any(),any(),eq("DE-BE"))).thenReturn(5);
        when(holidays.holidays(anyInt(),eq("DE-BE"))).thenReturn(List.of());
    }

    @Test void traineeSubmitsInstructorApprovesAndBalanceIsReserved() throws Exception {
        long id=submit();
        mvc.perform(get("/api/trainees/"+traineeId+"/leave-balance").param("year",start.substring(0,4)).with(user("trainee@example.test")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pending").value(5)).andExpect(jsonPath("$.available").value(25));
        mvc.perform(put("/api/leave-requests/"+id+"/approve").with(user("instructor@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"comment\":\"Freigegeben\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));
        mvc.perform(get("/api/leave-requests/"+id).with(user("trainee@example.test")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.decisionComment").value("Freigegeben"));
        assertEquals(1,approvals.count());
    }

    @Test void rejectionNeedsReasonAndReleasesReservation() throws Exception {
        long id=submit();
        mvc.perform(put("/api/leave-requests/"+id+"/reject").with(user("instructor@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"comment\":\" \"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(put("/api/leave-requests/"+id+"/reject").with(user("instructor@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"comment\":\"Zeitraum nicht möglich\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(get("/api/trainees/"+traineeId+"/leave-balance").param("year",start.substring(0,4)).with(user("trainee@example.test")))
            .andExpect(jsonPath("$.available").value(30));
    }

    @Test void anonymousRequestsAndMissingCsrfAreRejected() throws Exception {
        mvc.perform(get("/api/leave-requests")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/leave-requests").with(user("trainee@example.test"))
                .contentType(MediaType.APPLICATION_JSON).content(payload(start,end)))
            .andExpect(status().isForbidden());
    }

    @Test void otherTraineeCannotReadOrWithdrawAndCannotApprove() throws Exception {
        long id=submit();
        mvc.perform(get("/api/leave-requests/"+id).with(user("other-trainee@example.test"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/leave-requests/"+id+"/withdraw").with(user("other-trainee@example.test")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(put("/api/leave-requests/"+id+"/approve").with(user("trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/leave-requests").with(user("other-trainee@example.test"))).andExpect(content().json("[]"));
    }

    @Test void unassignedInstructorCannotReadOrApprove() throws Exception {
        long id=submit();
        mvc.perform(get("/api/leave-requests/"+id).with(user("other-instructor@example.test"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/leave-requests/"+id+"/approve").with(user("other-instructor@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test void withdrawalOnlyWorksOnceAndRestoresBalance() throws Exception {
        long id=submit();
        mvc.perform(put("/api/leave-requests/"+id+"/withdraw").with(user("trainee@example.test")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("WITHDRAWN"));
        mvc.perform(put("/api/leave-requests/"+id+"/withdraw").with(user("trainee@example.test")).with(csrf())).andExpect(status().isConflict());
        mvc.perform(get("/api/trainees/"+traineeId+"/leave-balance").param("year",start.substring(0,4)).with(user("trainee@example.test")))
            .andExpect(jsonPath("$.available").value(30));
    }

    @Test void overlapAndInsufficientBalanceAreRejected() throws Exception {
        submit();
        mvc.perform(post("/api/leave-requests").with(user("trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload(start,end)))
            .andExpect(status().isConflict());
        var allowance=entitlements.findByTraineeIdAndYear(otherTraineeId,Integer.parseInt(start.substring(0,4))).orElseThrow();
        allowance.days=2; entitlements.save(allowance);
        mvc.perform(post("/api/leave-requests").with(user("other-trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload(start,end)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test void datesAndZeroWorkingDaysAreValidated() throws Exception {
        mvc.perform(post("/api/leave-requests").with(user("trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload(end,start)))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/leave-requests").with(user("trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload("2020-01-01","2020-01-02")))
            .andExpect(status().isBadRequest());
        when(holidays.workingDays(any(),any(),anyString())).thenReturn(0);
        mvc.perform(post("/api/leave-requests").with(user("trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload(start,end)))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test void decisionsCannotBeRepeatedOrWithdrawnAfterApproval() throws Exception {
        long id=submit();
        mvc.perform(put("/api/leave-requests/"+id+"/approve").with(user("instructor@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isOk());
        mvc.perform(put("/api/leave-requests/"+id+"/approve").with(user("instructor@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isConflict());
        mvc.perform(put("/api/leave-requests/"+id+"/withdraw").with(user("trainee@example.test")).with(csrf())).andExpect(status().isConflict());
        assertEquals(1,approvals.count());
    }

    @Test void adminManagesEntitlementButCannotReduceReservedDays() throws Exception {
        submit();
        mvc.perform(put("/api/trainees/"+traineeId+"/entitlement").with(user("admin@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"year\":"+start.substring(0,4)+",\"days\":3}"))
            .andExpect(status().isConflict());
        mvc.perform(put("/api/trainees/"+traineeId+"/entitlement").with(user("admin@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"year\":"+start.substring(0,4)+",\"days\":20}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(15));
        mvc.perform(get("/api/admin/users").with(user("trainee@example.test"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").with(user("admin@example.test"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test void disabledAccountCannotUseExistingAuthentication() throws Exception {
        var account=users.findByEmail("trainee@example.test").orElseThrow(); account.active=false; users.save(account);
        mvc.perform(get("/api/auth/me").with(user("trainee@example.test"))).andExpect(status().isUnauthorized());
    }

    @Test void invalidLoginFailsAndCorrectLoginCreatesSession() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).param("email","trainee@example.test").param("password","incorrect"))
            .andExpect(status().isUnauthorized());
        var result=mvc.perform(post("/api/auth/login").with(csrf()).param("email","trainee@example.test").param("password","valid-test-password"))
            .andExpect(status().isNoContent()).andReturn();
        var session=(org.springframework.mock.web.MockHttpSession)result.getRequest().getSession(false);
        assertNotNull(session);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("TRAINEE"));
    }

    @Test void passwordResetInvalidatesOldSession() throws Exception {
        var result=mvc.perform(post("/api/auth/login").with(csrf()).param("email","trainee@example.test").param("password","valid-test-password"))
                .andExpect(status().isNoContent()).andReturn();
        var session=(org.springframework.mock.web.MockHttpSession)result.getRequest().getSession(false);
        mvc.perform(put("/api/admin/users/"+users.findByEmail("trainee@example.test").orElseThrow().id+"/password")
                .with(user("admin@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"new-valid-password\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test void setupRequiresLocalTokenAndCanOnlyRunOnce() throws Exception {
        approvals.deleteAll(); requests.deleteAll(); entitlements.deleteAll(); trainees.deleteAll(); users.deleteAll();
        mvc.perform(get("/api/setup/status")).andExpect(jsonPath("$.required").value(true));
        String json="{\"token\":\"%s\",\"firstName\":\"Verwaltung\",\"lastName\":\"Testkonto\",\"email\":\"setup@example.test\",\"password\":\"valid-test-password\"}";
        mvc.perform(post("/api/setup").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.formatted("wrong-token")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/setup").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.formatted("test-setup-token-not-for-real-use")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(post("/api/setup").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.formatted("test-setup-token-not-for-real-use")))
                .andExpect(status().isConflict());
    }

    @Test void concurrentSubmissionsCannotReserveTheSameDatesTwice() throws Exception {
        try (var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var gate=new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<Integer> action=() -> {
                gate.await();
                return mvc.perform(post("/api/leave-requests").with(user("trainee@example.test")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(payload(start,end))).andReturn().getResponse().getStatus();
            };
            var first=executor.submit(action); var second=executor.submit(action); gate.countDown();
            var statuses=List.of(first.get(),second.get()).stream().sorted().toList();
            assertEquals(List.of(201,409),statuses);
            assertEquals(1,requests.count());
        }
    }

    @Test void adminCreatesUsersAndRejectsDuplicateEmail() throws Exception {
        var json="{\"firstName\":\"Ausbilder\",\"lastName\":\"Testkonto\",\"email\":\"new@example.test\",\"password\":\"valid-test-password\",\"role\":\"INSTRUCTOR\",\"entitlement\":0}";
        mvc.perform(post("/api/admin/users").with(user("admin@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(post("/api/admin/users").with(user("admin@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isConflict());
    }

    @Test void apiDocumentationIncludesSessionLoginAndCsrfHeader() throws Exception {
        mvc.perform(get("/api/openapi").with(user("admin@example.test")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.paths['/api/auth/login'].post").exists())
                .andExpect(jsonPath("$.paths['/api/leave-requests'].post.parameters[0].name").value("X-CSRF-TOKEN"));
        mvc.perform(get("/api/holidays").param("year","1900").with(user("trainee@example.test")))
                .andExpect(status().isBadRequest());
    }

    private long submit() throws Exception {
        mvc.perform(post("/api/leave-requests").with(user("trainee@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(payload(start,end))).andExpect(status().isCreated());
        return requests.findAll().getFirst().id;
    }

    @Test void instructorCodeCreatesOnlyAnInstructorAndCanOnlyBeUsedOnce() throws Exception {
        String code=invite("INSTRUCTOR",null,null,0);
        assertTrue(code.startsWith("AB-"));
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(code,"invited-instructor@example.test")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("INSTRUCTOR"));
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(code,"second-instructor@example.test")))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/invitations").with(user("admin@example.test")))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].code").doesNotExist())
            .andExpect(jsonPath("$[0].codeHash").doesNotExist()).andExpect(jsonPath("$[0].redeemedAt").isNotEmpty());
    }

    @Test void traineeCodeSetsAssignedInstructorAndSpecifiedYearAllowance() throws Exception {
        Long instructor=users.findByEmail("instructor@example.test").orElseThrow().id;
        String code=invite("TRAINEE",instructor,"Ausbildungsbereich",24);
        assertTrue(code.startsWith("AZ-"));
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(code,"invited-trainee@example.test")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("TRAINEE"))
            .andExpect(jsonPath("$.instructorId").value(instructor)).andExpect(jsonPath("$.trainingProgram").value("Ausbildungsbereich"));
        var trainee=trainees.findByUserId(users.findByEmail("invited-trainee@example.test").orElseThrow().id).orElseThrow();
        assertEquals(24,entitlements.findByTraineeIdAndYear(trainee.id,2027).orElseThrow().days);
    }

    @Test void expiredAndRevokedCodesCannotBeRedeemed() throws Exception {
        String expired=invite("INSTRUCTOR",null,null,0);
        var invitation=invitations.findAll().getFirst(); invitation.expiresAt=Instant.parse("2020-01-01T00:00:00Z"); invitations.save(invitation);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(expired,"expired@example.test"))).andExpect(status().isBadRequest());
        String revoked=invite("INSTRUCTOR",null,null,0);
        var active=invitations.findAllByOrderByCreatedAtDesc().getFirst();
        mvc.perform(put("/api/admin/invitations/"+active.id+"/revoke").with(user("admin@example.test")).with(csrf()))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(revoked,"revoked@example.test"))).andExpect(status().isBadRequest());
    }

    @Test void failedRegistrationDoesNotConsumeCode() throws Exception {
        String code=invite("INSTRUCTOR",null,null,0);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(code,"instructor@example.test"))).andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(code,"unused-email@example.test"))).andExpect(status().isCreated());
    }

    @Test void traineesCannotManageInvitationsAndAdminCodesAreNotSupported() throws Exception {
        String json="{\"role\":\"INSTRUCTOR\",\"year\":2027,\"days\":0,\"validDays\":7}";
        mvc.perform(post("/api/admin/invitations").with(user("trainee@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/invitations").with(user("admin@example.test")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.replace("INSTRUCTOR","ADMIN")))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registration("not-valid","test@example.test")))
            .andExpect(status().isForbidden());
    }

    @Test void instructorInvitesTraineeAssignedToSelfWithChosenAllowance() throws Exception {
        Long instructor=users.findByEmail("instructor@example.test").orElseThrow().id;
        String code=inviteAs("instructor@example.test","TRAINEE",null,"Eigener Ausbildungsbereich",24);
        assertTrue(code.startsWith("AZ-"));
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(code,"instructor-invited@example.test")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("TRAINEE"))
            .andExpect(jsonPath("$.instructorId").value(instructor));
        var profile=trainees.findByUserId(users.findByEmail("instructor-invited@example.test").orElseThrow().id).orElseThrow();
        assertEquals(24,entitlements.findByTraineeIdAndYear(profile.id,2027).orElseThrow().days);
        mvc.perform(get("/api/trainees").with(user("instructor@example.test")))
            .andExpect(jsonPath("$[?(@.email == 'instructor-invited@example.test')]").isNotEmpty());
        mvc.perform(get("/api/trainees").with(user("other-instructor@example.test")))
            .andExpect(content().json("[]"));
    }

    @Test void instructorCannotCreateOtherRolesOrAssignAnotherInstructor() throws Exception {
        Long other=users.findByEmail("other-instructor@example.test").orElseThrow().id;
        for (String role:List.of("INSTRUCTOR","ADMIN")) {
            mvc.perform(post("/api/invitations").with(user("instructor@example.test")).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"role\":\""+role+"\",\"year\":2027,\"days\":0,\"validDays\":7}"))
                .andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/invitations").with(user("instructor@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"TRAINEE\",\"trainingProgram\":\"Bereich\",\"instructorId\":"+other+",\"year\":2027,\"days\":20,\"validDays\":7}"))
            .andExpect(status().isForbidden());
        assertEquals(0,invitations.count());
    }

    @Test void instructorCanOnlyListAndRevokeOwnTraineeInvitations() throws Exception {
        Long instructor=users.findByEmail("instructor@example.test").orElseThrow().id;
        invite("INSTRUCTOR",null,null,0);
        invite("TRAINEE",instructor,"Von Verwaltung",20);
        inviteAs("other-instructor@example.test","TRAINEE",null,"Anderer Bereich",20);
        var foreignIds=invitations.findAll().stream().map(i -> i.id).toList();
        String ownCode=inviteAs("instructor@example.test","TRAINEE",null,"Eigener Bereich",20);
        var own=invitations.findAll().stream().filter(i -> !foreignIds.contains(i.id)).findFirst().orElseThrow();
        mvc.perform(get("/api/invitations").with(user("instructor@example.test")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(own.id)).andExpect(jsonPath("$[0].role").value("TRAINEE"))
            .andExpect(jsonPath("$[0].code").doesNotExist()).andExpect(jsonPath("$[0].codeHash").doesNotExist());
        mvc.perform(get("/api/invitations").with(user("admin@example.test")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
        for (Long id:foreignIds) {
            mvc.perform(put("/api/invitations/"+id+"/revoke").with(user("instructor@example.test")).with(csrf()))
                .andExpect(status().isForbidden());
            assertNull(invitations.findById(id).orElseThrow().revokedAt);
        }
        mvc.perform(get("/api/invitations").with(user("trainee@example.test"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/invitations/"+own.id+"/revoke").with(user("trainee@example.test")).with(csrf()))
            .andExpect(status().isForbidden());
        mvc.perform(put("/api/invitations/"+own.id+"/revoke").with(user("instructor@example.test")))
            .andExpect(status().isForbidden());
        mvc.perform(put("/api/invitations/"+own.id+"/revoke").with(user("instructor@example.test")).with(csrf()))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(registration(ownCode,"revoked-own@example.test"))).andExpect(status().isBadRequest());
    }

    @Test void deactivatedInstructorCannotManageInvitations() throws Exception {
        var instructor=users.findByEmail("instructor@example.test").orElseThrow();
        instructor.active=false; users.saveAndFlush(instructor);
        mvc.perform(get("/api/invitations").with(user("instructor@example.test"))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/invitations").with(user("instructor@example.test")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"TRAINEE\",\"trainingProgram\":\"Bereich\",\"year\":2027,\"days\":20,\"validDays\":7}"))
            .andExpect(status().isUnauthorized());
    }

    @Test void concurrentRedemptionCreatesOnlyOneAccount() throws Exception {
        String code=invite("INSTRUCTOR",null,null,0);
        try (var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var gate=new java.util.concurrent.CountDownLatch(1);
            var a=executor.submit(() -> { gate.await(); return mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(registration(code,"concurrent-one@example.test"))).andReturn().getResponse().getStatus(); });
            var b=executor.submit(() -> { gate.await(); return mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(registration(code,"concurrent-two@example.test"))).andReturn().getResponse().getStatus(); });
            gate.countDown(); assertEquals(List.of(201,400),List.of(a.get(),b.get()).stream().sorted().toList());
        }
    }

    private String invite(String role,Long instructor,String program,int days) throws Exception {
        return inviteAs("admin@example.test",role,instructor,program,days);
    }

    private String inviteAs(String creator,String role,Long instructor,String program,int days) throws Exception {
        String json="{\"role\":\""+role+"\",\"year\":2027,\"days\":"+days+",\"validDays\":7,\"instructorId\":"+instructor+",\"trainingProgram\":"+(program==null?"null":"\""+program+"\"")+"}";
        var result=mvc.perform(post("/api/invitations").with(user(creator)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isCreated()).andReturn();
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(),"$.code");
    }

    private String registration(String code,String email) {
        return "{\"code\":\""+code+"\",\"firstName\":\"Registrierung\",\"lastName\":\"Testkonto\",\"email\":\""+email+"\",\"password\":\"valid-test-password\",\"role\":\"ADMIN\"}";
    }
    private String payload(String from,String to) {
        return "{\"startDate\":\""+from+"\",\"endDate\":\""+to+"\",\"reason\":\"\"}";
    }
    private UserAccount account(String email,Role role) {
        var u=new UserAccount(); u.firstName=role.name(); u.lastName="Testkonto"; u.email=email;
        u.passwordHash=passwords.encode("valid-test-password"); u.role=role; u.createdAt=Instant.now();
        return users.saveAndFlush(u);
    }
    private Long profile(Long userId,Long instructorId) {
        var t=new Trainee(); t.userId=userId; t.instructorId=instructorId; t.trainingProgram="Testbereich";
        return trainees.saveAndFlush(t).id;
    }
    private void allowance(Long traineeId,int year,int days) {
        var a=new LeaveEntitlement(); a.traineeId=traineeId; a.year=year; a.days=days; entitlements.saveAndFlush(a);
    }
}
