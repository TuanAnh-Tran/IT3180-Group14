package com.cnpm.apartment.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Biên lai thanh toán.
 * Bảng này do module Thu phí (Anh Hiếu) tạo và quản lý.
 * Mỗi lần ghi nhận nộp tiền sẽ sinh ra 1 bản ghi Receipt.
 */
@Entity
@Table(name = "receipt")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Receipt {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    /** Liên kết đến phí được gán cho hộ */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_fee_id", nullable = false)
    private AssignedFee assignedFee;

    /** Số tiền thực tế đã nộp */
    @Column(name = "amount_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaid;

    /** Thời điểm nộp tiền */
    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

    /** Ghi chú (ví dụ: "Nộp thay", "Chuyển khoản", v.v.) */
    @Column(name = "note", length = 500)
    private String note;

    /** Người thu tiền (username của nhân viên/kế toán) */
    @Column(name = "created_by", length = 100)
    private String createdBy;

    /** Thời điểm tạo bản ghi */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.paidAt == null) {
            this.paidAt = LocalDateTime.now();
        }
    }
}
