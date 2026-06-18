package com.cnpm.apartment.model;

import com.cnpm.apartment.model.enums.FeeStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phí được gán cho từng hộ trong từng đợt thu.
 * Đây là bảng TRUNG TÂM của module Thu phí.
 * Bảng này do module Đợt thu phí (Phùng Việt Cường) tạo ra,
 * module Thu phí sẽ CẬP NHẬT status và paidAt khi thu tiền.
 */
@Entity
@Table(name = "assigned_fee")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignedFee {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    // FK → Household
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    // FK → CollectionPeriod
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CollectionPeriod period;

    // FK → Fee
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fee_id", nullable = false)
    private Fee fee;

    /**
     * Số lượng (dùng cho PER_VEHICLE hoặc các phí tính theo số lượng).
     * Với FIXED/PER_PERSON/PER_M2 thì quantity = 1.
     */
    @Column(name = "quantity", nullable = false)
    private double quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FeeStatus status;

    @Builder.Default
    @Column(name = "amount_paid_accumulated", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaidAccumulated = BigDecimal.ZERO;

    /** Thời điểm thanh toán, null nếu chưa nộp */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
