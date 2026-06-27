package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class DeathReportRequest {
    @PastOrPresent(message = "Date of death cannot be in the future")
    private LocalDate dateOfDeath;

    @Pattern(regexp = VietnamDataRules.OPTIONAL_CITIZEN_ID_REGEX,
            message = "Replacement head Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String replacementHeadIdentityNo;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;
}
