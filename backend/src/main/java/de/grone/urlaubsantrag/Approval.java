package de.grone.urlaubsantrag;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "approvals")
public class Approval {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false, unique = true) Long leaveRequestId;
    @Column(nullable = false) Long approverId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) LeaveStatus decision;
    @Column(nullable = false, length = 2000) String comment = "";
    @Column(nullable = false) Instant decisionDate;

    protected Approval() {}
}
