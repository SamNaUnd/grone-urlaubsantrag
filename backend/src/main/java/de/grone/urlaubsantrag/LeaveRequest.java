package de.grone.urlaubsantrag;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "leave_requests")
public class LeaveRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false) Long traineeId;
    @Column(nullable = false) LocalDate startDate;
    @Column(nullable = false) LocalDate endDate;
    @Column(nullable = false) int totalDays;
    @Column(nullable = false, length = 2000) String reason = "";
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) LeaveStatus status = LeaveStatus.OPEN;
    @Column(nullable = false) Instant createdAt;

    protected LeaveRequest() {}
}
