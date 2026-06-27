package com.cnpm.apartment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequestDTO {

    @NotBlank(message = "Assigned fee ID is required")
    private String assignedFeeId;

    @DecimalMin(value = "0.01", message = "Payment amount must be greater than 0")
    private BigDecimal amountPaid;

    private String note;

    private String payerName;

    private java.time.LocalDateTime paidAt;

    private String idempotencyKey;
}
