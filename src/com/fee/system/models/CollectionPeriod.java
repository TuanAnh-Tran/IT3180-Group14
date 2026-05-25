package com.fee.system.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * LỚP ĐỐI TƯỢNG ĐỢT THU (COLLECTION PERIOD MODEL)
 * Đại diện cho một đợt vận động hoặc chiến dịch thu phí định kỳ (VD: Thu phí tháng 05/2026,...)
 */
public class CollectionPeriod {
    
    /**
     * Enum định nghĩa trạng thái của đợt thu:
     * - ACTIVE: Đang thu (Cho phép gán thêm khoản thu, nhập chỉ số nước và thanh toán).
     * - CLOSED: Đã khóa đợt thu (Dữ liệu đóng băng để báo cáo thống kê, không cho chỉnh sửa nữa).
     */
    public enum PeriodStatus {
        ACTIVE, // Đợt thu đang hoạt động
        CLOSED  // Đợt thu đã đóng/khóa sổ
    }

    private String id;               // Mã đợt thu duy nhất
    private String name;             // Tên đợt thu (VD: Đợt thu tháng 5)
    private List<String> feeIds;     // Danh sách các Mã khoản thu được áp dụng trong đợt này
    private PeriodStatus status;     // Trạng thái đợt thu
    private LocalDateTime createdAt; // Thời gian khởi tạo đợt thu

    /**
     * Phương thức khởi tạo một Đợt thu mới
     * @param id Mã đợt thu
     * @param name Tên đợt thu
     * @param feeIds Danh sách khoản thu áp dụng ban đầu
     */
    public CollectionPeriod(String id, String name, List<String> feeIds) {
        this.id = id;
        this.name = name;
        // Tránh lỗi NullPointerException bằng cách khởi tạo danh sách rỗng nếu truyền null
        this.feeIds = feeIds != null ? feeIds : new ArrayList<>();
        this.status = PeriodStatus.ACTIVE; // Mặc định khi tạo mới đợt thu là Đang hoạt động
        this.createdAt = LocalDateTime.now(); // Ghi nhận thời gian hiện tại
    }

    // --- CÁC PHƯƠNG THỨC GETTER VÀ SETTER ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getFeeIds() { return feeIds; }
    public void setFeeIds(List<String> feeIds) { this.feeIds = feeIds; }

    public PeriodStatus getStatus() { return status; }
    public void setStatus(PeriodStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return "CollectionPeriod{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", feeIds=" + feeIds +
                ", status=" + status +
                ", createdAt=" + createdAt +
                '}';
    }
}
