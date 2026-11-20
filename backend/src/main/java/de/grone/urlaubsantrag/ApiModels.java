package de.grone.urlaubsantrag;

import jakarta.validation.constraints.*;
import java.time.*;

public final class ApiModels {
    private ApiModels() {}

    public record UserView(Long id, String firstName, String lastName, String email, Role role,
            boolean active, Long traineeId, String trainingProgram, Long instructorId,
            String instructorName, String trainingLocation) {}

    public record CreateUser(@NotBlank @Size(max=100) String firstName,
            @NotBlank @Size(max=100) String lastName, @NotBlank @Email @Size(max=254) String email,
            @NotBlank @Size(min=12,max=72) String password, @NotNull Role role,
            @Size(max=150) String trainingProgram, Long instructorId,
            @Min(0) @Max(366) int entitlement) {}

    public record UpdateUser(@NotBlank @Size(max=100) String firstName,
            @NotBlank @Size(max=100) String lastName, @NotBlank @Email @Size(max=254) String email,
            @NotNull Role role, boolean active, @Size(max=150) String trainingProgram,
            Long instructorId) {}

    public record SetupInput(@NotBlank String token, @NotBlank @Size(max=100) String firstName,
            @NotBlank @Size(max=100) String lastName, @NotBlank @Email @Size(max=254) String email,
            @NotBlank @Size(min=12,max=72) String password) {}

    public record PasswordInput(@NotBlank String currentPassword,
            @NotBlank @Size(min=12,max=72) String newPassword) {}

    public record ResetPassword(@NotBlank @Size(min=12,max=72) String password) {}

    public record RequestInput(@NotNull LocalDate startDate, @NotNull LocalDate endDate,
            @Size(max=2000) String reason) {}

    public record DecisionInput(@Size(max=2000) String comment) {}
    public record EntitlementInput(@Min(2020) @Max(2100) int year, @Min(0) @Max(366) int days) {}

    public record Balance(Long traineeId, int year, int entitlement, int taken,
            int approvedUpcoming, int pending, int available) {}

    public record RequestView(Long id, Long traineeId, String traineeName, String trainingProgram,
            String instructorName, LocalDate startDate, LocalDate endDate, int totalDays,
            String reason, LeaveStatus status, Instant createdAt, String decisionComment,
            String decidedBy, Instant decidedAt) {}

    public record Preview(int days, Balance balance) {}
    public record Holiday(LocalDate date, String name) {}

    public record CreateInvitation(@NotNull Role role, @Size(max=150) String trainingProgram,
            Long instructorId, @Min(2020) @Max(2100) int year, @Min(0) @Max(366) int days,
            @Min(1) @Max(30) int validDays) {}

    public record RegistrationInput(@NotBlank @Size(max=100) String code,
            @NotBlank @Size(max=100) String firstName, @NotBlank @Size(max=100) String lastName,
            @NotBlank @Email @Size(max=254) String email, @NotBlank @Size(min=12,max=72) String password) {}

    public record InvitationView(Long id, Role role, String trainingProgram, String instructorName,
            int year, int days, Instant createdAt, Instant expiresAt, Instant redeemedAt, Instant revokedAt) {}
    public record CreatedInvitation(InvitationView invitation, String code) {}
}
