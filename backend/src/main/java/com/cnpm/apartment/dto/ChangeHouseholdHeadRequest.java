package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangeHouseholdHeadRequest {
    @NotBlank(message = "Citizen ID of the new household head is required")
    @Pattern(regexp = VietnamDataRules.CITIZEN_ID_REGEX,
            message = "Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String identityNo;

    @Size(max = 1000, message = "Reason must be at most 1000 characters")
    private String reason;
}
