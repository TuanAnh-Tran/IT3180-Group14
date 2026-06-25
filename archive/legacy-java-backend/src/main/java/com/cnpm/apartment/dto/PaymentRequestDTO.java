package com.cnpm.apartment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request ghi nhận nộp tiền.
 */
@Data
public class PaymentRequestDTO {

    @NotBlank(message = "assignedFeeId không được để trống")
    private String assignedFeeId;

    @jakarta.validation.constraints.DecimalMin(value = "0.01", message = "Số tiền phải lớn hơn 0")
    private java.math.BigDecimal amountPaid;

    private String note; // Tùy chọn: ghi chú thêm
}
