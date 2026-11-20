package de.grone.urlaubsantrag;

import static de.grone.urlaubsantrag.ApiModels.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class InvitationController {
    private final InvitationService invitations;
    public InvitationController(InvitationService invitations) { this.invitations=invitations; }

    @GetMapping("/admin/invitations")
    public List<InvitationView> list() { return invitations.list(); }
    @PostMapping("/admin/invitations")
    public ResponseEntity<CreatedInvitation> create(@Valid @RequestBody CreateInvitation input) {
        return ResponseEntity.status(201).body(invitations.create(input));
    }
    @PutMapping("/admin/invitations/{id}/revoke")
    public ResponseEntity<Void> revoke(@PathVariable Long id) {
        invitations.revoke(id); return ResponseEntity.noContent().build();
    }
    @PostMapping("/auth/register")
    public ResponseEntity<UserView> register(@Valid @RequestBody RegistrationInput input) {
        return ResponseEntity.status(201).body(invitations.register(input));
    }
}
