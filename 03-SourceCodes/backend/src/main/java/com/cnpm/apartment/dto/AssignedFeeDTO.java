package com.cnpm.apartment.dto;

import com.cnpm.apartment.model.enums.FeeStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response cho danh sách phí được gán (dùng ở trang Xem nợ / Danh sách thu).
 */
@Data
@Builder
public class AssignedFeeDTO {

    private String id;

    // Thông tin hộ
    private String householdId;
    private String ownerName;
    private int membersCount;
    private double area;
    private int motorcycleCount;
    private int carCount;

    // Thông tin đợt thu
    private String periodId;
    private String periodName;

    // Thông tin khoản phí
    private String feeId;
    private String feeName;
    private String feeType;
    private String calcMethod;
    private java.math.BigDecimal unitPrice;

    // Tính toán
    private double quantity;
    private java.math.BigDecimal amountRequired;   // Số tiền phải nộp (tính theo calcMethod)
    private java.math.BigDecimal amountPaidAccumulated;

    // Trạng thái
    private FeeStatus status;
    private LocalDateTime paidAt;
}
