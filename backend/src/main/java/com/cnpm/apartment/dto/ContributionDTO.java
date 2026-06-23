package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ContributionDTO {
    private String householdId;
    private String ownerName;
    private String feeName;
    private BigDecimal amountPaid;
    private LocalDateTime paidAt;
}
