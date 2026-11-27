package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.ApiModels.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.time.LocalDate;
import java.util.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@Validated
public class ApiController {
    private final AccountService accounts;
    private final LeaveService leaves;
    private final SetupService setup;
    private final HolidayService holidays;

    public ApiController(AccountService accounts,LeaveService leaves,SetupService setup,HolidayService holidays) {
        this.accounts=accounts; this.leaves=leaves; this.setup=setup; this.holidays=holidays;
    }

    @GetMapping("/auth/csrf")
    public Map<String,String> csrf(CsrfToken token) {
        return Map.of("token",token.getToken(),"headerName",token.getHeaderName());
    }
    @GetMapping("/auth/me") public UserView me() { return accounts.me(); }
    @GetMapping("/setup/status") public Map<String,Boolean> setupStatus() { return Map.of("required",setup.required()); }
    @PostMapping("/setup") public ResponseEntity<UserView> setup(@Valid @RequestBody SetupInput input) {
        return ResponseEntity.status(201).body(setup.setup(input));
    }
    @PutMapping("/auth/password")
    public ResponseEntity<Void> password(@Valid @RequestBody PasswordInput input,HttpServletRequest request) {
        accounts.changePassword(input);
        if (request.getSession(false)!=null) request.getSession(false).invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/trainees") public List<UserView> trainees() { return accounts.listTrainees(); }
    @GetMapping("/balances")
    public List<Balance> balances(@RequestParam @Min(2020) @Max(2100) int year) {
        return accounts.listTrainees().stream().map(t -> leaves.balance(t.traineeId(),year)).toList();
    }
    @GetMapping("/trainees/{id}/leave-balance")
    public Balance balance(@PathVariable Long id,@RequestParam @Min(2020) @Max(2100) int year) {
        return leaves.balance(id,year);
    }
    @PutMapping("/trainees/{id}/entitlement")
    public Balance entitlement(@PathVariable Long id,@Valid @RequestBody EntitlementInput input) {
        return leaves.setEntitlement(id,input);
    }
    @GetMapping("/leave-requests") public List<RequestView> list() { return leaves.list(); }
    @GetMapping("/leave-requests/preview")
    public Preview preview(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return leaves.preview(startDate,endDate);
    }
    @PostMapping("/leave-requests")
    public ResponseEntity<RequestView> create(@Valid @RequestBody RequestInput input) {
        var created=leaves.create(input);
        return ResponseEntity.created(URI.create("/api/leave-requests/"+created.id())).body(created);
    }
    @GetMapping("/leave-requests/{id}") public RequestView detail(@PathVariable Long id) { return leaves.detail(id); }
    @PutMapping("/leave-requests/{id}/withdraw") public RequestView withdraw(@PathVariable Long id) { return leaves.withdraw(id); }
    @PutMapping("/leave-requests/{id}/approve")
    public RequestView approve(@PathVariable Long id,@Valid @RequestBody DecisionInput input) {
        return leaves.decide(id,true,input.comment());
    }
    @PutMapping("/leave-requests/{id}/reject")
    public RequestView reject(@PathVariable Long id,@Valid @RequestBody DecisionInput input) {
        return leaves.decide(id,false,input.comment());
    }
    @GetMapping("/holidays")
    public List<Holiday> holidays(@RequestParam @Min(2020) @Max(2100) int year) {
        accounts.current(); return holidays.holidays(year,"DE-BE");
    }
    @GetMapping("/admin/users") public List<UserView> users() { return accounts.listUsers(); }
    @PostMapping("/admin/users") public ResponseEntity<UserView> user(@Valid @RequestBody CreateUser input) {
        var created=accounts.create(input);
        return ResponseEntity.created(URI.create("/api/admin/users/"+created.id())).body(created);
    }
    @PutMapping("/admin/users/{id}") public UserView update(@PathVariable Long id,@Valid @RequestBody UpdateUser input) {
        return accounts.update(id,input);
    }
    @PutMapping("/admin/users/{id}/password")
    public ResponseEntity<Void> reset(@PathVariable Long id,@Valid @RequestBody ResetPassword input) {
        accounts.resetPassword(id,input); return ResponseEntity.noContent().build();
    }
}
