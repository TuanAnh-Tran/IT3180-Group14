package com.fee.system.models;

import java.time.LocalDateTime;

/**
 * LỚP ĐỐI TƯỢNG LƯỢT GÁN PHÍ CHO HỘ DÂN (ASSIGNED FEE MODEL)
 * Đóng vai trò là bảng liên kết trung gian (nhiều-nhiều) ghi nhận:
 * Căn hộ nào cần đóng khoản phí nào trong đợt thu nào, với số lượng và trạng thái đóng tiền ra sao.
 */
public class AssignedFee {
    
    /**
     * Enum quản lý trạng thái thanh toán của mục phí:
     * - UNPAID: Chưa đóng tiền.
     * - PAID: Đã đóng tiền hoàn tất.
     */
    public enum PaymentStatus {
        UNPAID, // Chưa thanh toán
        PAID    // Đã thanh toán
    }

    private String id;              // Mã lượt gán duy nhất
    private String householdId;     // Mã liên kết hộ gia đình (Foreign Key)
    private String periodId;        // Mã liên kết đợt thu (Foreign Key)
    private String feeId;           // Mã liên kết khoản thu (Foreign Key)
    private double quantity;        // Lượng thu thực tế (Số người, số m2, số khối nước tiêu dùng, hoặc 1)
    private PaymentStatus status;   // Trạng thái thanh toán của hộ
    private LocalDateTime paidAt;   // Thời gian thực tế hộ dân nộp tiền đóng phí (Null nếu chưa đóng)

    /**
     * Phương thức khởi tạo lượt gán đóng phí mới
     * @param id Mã lượt gán
     * @param householdId Mã hộ
     * @param periodId Mã đợt thu
     * @param feeId Mã khoản thu
     * @param quantity Số lượng / Chỉ số đo đạc ban đầu
     */
    public AssignedFee(String id, String householdId, String periodId, String feeId, double quantity) {
        this.id = id;
        this.householdId = householdId;
        this.periodId = periodId;
        this.feeId = feeId;
        this.quantity = quantity;
        this.status = PaymentStatus.UNPAID; // Mặc định khi gán đóng phí là Chưa thanh toán
        this.paidAt = null;                 // Chưa có mốc thời gian đóng
    }

    // --- CÁC PHƯƠNG THỨC GETTER VÀ SETTER ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHouseholdId() { return householdId; }
    public void setHouseholdId(String householdId) { this.householdId = householdId; }

    public String getPeriodId() { return periodId; }
    public void setPeriodId(String periodId) { this.periodId = periodId; }

    public String getFeeId() { return feeId; }
    public void setFeeId(String feeId) { this.feeId = feeId; }

    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    @Override
    public String toString() {
        return "AssignedFee{" +
                "id='" + id + '\'' +
                ", householdId='" + householdId + '\'' +
                ", periodId='" + periodId + '\'' +
                ", feeId='" + feeId + '\'' +
                ", quantity=" + quantity +
                ", status=" + status +
                ", paidAt=" + paidAt +
                '}';
    }
}
