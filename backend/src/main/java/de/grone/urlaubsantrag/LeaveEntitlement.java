package de.grone.urlaubsantrag;

import jakarta.persistence.*;

@Entity
@Table(name = "leave_entitlements", uniqueConstraints = @UniqueConstraint(columnNames = {"trainee_id", "leave_year"}))
public class LeaveEntitlement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false) Long traineeId;
    @Column(name = "leave_year", nullable = false) int year;
    @Column(nullable = false) int days;

    protected LeaveEntitlement() {}
}
