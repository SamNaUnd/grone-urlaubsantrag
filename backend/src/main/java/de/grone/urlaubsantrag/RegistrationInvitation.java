package de.grone.urlaubsantrag;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="registration_invitations")
public class RegistrationInvitation {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @Column(nullable=false,unique=true,length=64) String codeHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) Role role;
    @Column(length=150) String trainingProgram;
    Long instructorId;
    @Column(nullable=false) int entitlementYear;
    @Column(nullable=false) int entitlementDays;
    @Column(nullable=false) Long createdById;
    @Column(nullable=false) Instant createdAt;
    @Column(nullable=false) Instant expiresAt;
    Instant redeemedAt;
    Instant revokedAt;

    protected RegistrationInvitation() {}
}
