package com.cnpm.apartment.dto;

import com.cnpm.apartment.model.enums.FeeStatus;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response trả về sau khi ghi nhận nộp tiền / xem biên lai.
 */
@Data
@Builder
public class ReceiptDTO {

    private String receiptId;

    // Thông tin hộ
    private String householdId;
    private String ownerName;

    // Thông tin đợt thu
    private String periodId;
    private String periodName;

    // Thông tin khoản phí
    private String feeId;
    private String feeName;
    private String feeType;

    // Thông tin thanh toán
    private BigDecimal amountRequired;   // Số tiền phải nộp
    private BigDecimal amountPaid;       // Số tiền đã nộp
    private BigDecimal amountPaidAccumulated;
    private LocalDateTime paidAt;
    private FeeStatus status;
    private String note;
    private String createdBy;
    private LocalDateTime createdAt;
}
