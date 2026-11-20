package de.grone.urlaubsantrag;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class UserAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    @Column(nullable = false, length = 100) String firstName;
    @Column(nullable = false, length = 100) String lastName;
    @Column(nullable = false, unique = true, length = 254) String email;
    @Column(nullable = false, length = 255) String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) Role role;
    @Column(nullable = false) boolean active = true;
    @Column(nullable = false) int credentialsVersion;
    @Column(nullable = false) Instant createdAt;

    protected UserAccount() {}
}
