package de.grone.urlaubsantrag;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);
    List<UserAccount> findAllByOrderByLastNameAscFirstNameAsc();
    boolean existsByEmail(String email);
}

interface TraineeRepository extends JpaRepository<Trainee, Long> {
    Optional<Trainee> findByUserId(Long userId);
    List<Trainee> findByInstructorId(Long instructorId);
    boolean existsByInstructorId(Long instructorId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Trainee t where t.id = :id")
    Optional<Trainee> lockById(@Param("id") Long id);
}

interface EntitlementRepository extends JpaRepository<LeaveEntitlement, Long> {
    Optional<LeaveEntitlement> findByTraineeIdAndYear(Long traineeId, int year);
    void deleteByTraineeId(Long traineeId);
}

interface LeaveRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByTraineeIdOrderByCreatedAtDesc(Long traineeId);
    List<LeaveRequest> findAllByOrderByCreatedAtDesc();
    boolean existsByTraineeId(Long traineeId);
}

interface ApprovalRepository extends JpaRepository<Approval, Long> {
    Optional<Approval> findByLeaveRequestId(Long requestId);
}

interface InvitationRepository extends JpaRepository<RegistrationInvitation,Long> {
    List<RegistrationInvitation> findAllByOrderByCreatedAtDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from RegistrationInvitation i where i.codeHash = :hash")
    Optional<RegistrationInvitation> lockByCodeHash(@Param("hash") String hash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from RegistrationInvitation i where i.id = :id")
    Optional<RegistrationInvitation> lockById(@Param("id") Long id);
}
