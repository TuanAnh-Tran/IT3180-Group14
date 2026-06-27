package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.PaymentProof;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentProofRepository extends JpaRepository<PaymentProof, String> {
    List<PaymentProof> findByStatus(PaymentProof.ProofStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentProof p WHERE p.id = :id")
    Optional<PaymentProof> findByIdForUpdate(@Param("id") String id);

    @Query("""
            SELECT p FROM PaymentProof p
            JOIN FETCH p.assignedFee af
            JOIN FETCH af.household
            JOIN FETCH af.fee
            WHERE p.status = :status
            """)
    List<PaymentProof> findByStatusWithDetails(@Param("status") PaymentProof.ProofStatus status);

    List<PaymentProof> findByAssignedFeeHouseholdId(String householdId);

    boolean existsByAssignedFeeIdAndStatus(String assignedFeeId, PaymentProof.ProofStatus status);

    boolean existsByTransactionIdIgnoreCase(String transactionId);
}
