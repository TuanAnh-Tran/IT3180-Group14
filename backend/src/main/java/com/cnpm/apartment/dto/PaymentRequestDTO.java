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

    @Min(value = 1, message = "Số tiền phải lớn hơn 0")
    private double amountPaid;

    private String note; // Tùy chọn: ghi chú thêm
}
