package com.cnpm.apartment.repository;

import com.cnpm.apartment.model.PaymentProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentProofRepository extends JpaRepository<PaymentProof, String> {
    List<PaymentProof> findByStatus(PaymentProof.ProofStatus status);
    List<PaymentProof> findByAssignedFeeHouseholdId(String householdId);
}
