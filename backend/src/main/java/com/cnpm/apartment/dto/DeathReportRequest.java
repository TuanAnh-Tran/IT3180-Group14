package com.cnpm.apartment.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class DeathReportRequest {
    private LocalDate dateOfDeath;
    private String replacementHeadIdentityNo;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;
}
