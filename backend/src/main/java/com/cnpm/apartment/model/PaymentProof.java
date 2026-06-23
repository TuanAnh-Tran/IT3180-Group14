package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_proof")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentProof {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_fee_id", nullable = false)
    private AssignedFee assignedFee;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "proof_image", length = 500)
    private String proofImage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private ProofStatus status = ProofStatus.PENDING;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    @Column(name = "payer_name", length = 255)
    private String payerName;

    @PrePersist
    public void prePersist() {
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = ProofStatus.PENDING;
        }
    }

    public enum ProofStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}
