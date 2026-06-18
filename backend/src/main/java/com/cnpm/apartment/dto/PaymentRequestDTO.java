package com.cnpm.apartment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.math.BigDecimal;

/**
 * Request ghi nhận nộp tiền.
 */
@Data
public class PaymentRequestDTO {

    @NotBlank(message = "assignedFeeId không được để trống")
    private String assignedFeeId;

    @DecimalMin(value = "0.01", message = "Số tiền phải lớn hơn 0")
    private BigDecimal amountPaid;

    private String note; // Tùy chọn: ghi chú thêm
}
