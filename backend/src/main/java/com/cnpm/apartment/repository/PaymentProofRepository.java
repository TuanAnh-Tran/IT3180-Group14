package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.PaymentProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentProofRepository extends JpaRepository<PaymentProof, String> {
    List<PaymentProof> findByStatus(PaymentProof.ProofStatus status);

    @Query("""
            SELECT p FROM PaymentProof p
            JOIN FETCH p.assignedFee af
            JOIN FETCH af.household
            JOIN FETCH af.fee
            WHERE p.status = :status
            """)
    List<PaymentProof> findByStatusWithDetails(@Param("status") PaymentProof.ProofStatus status);

    List<PaymentProof> findByAssignedFeeHouseholdId(String householdId);
}
