package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;

@Data
public class SplitHouseholdRequest {
    @Valid
    private HouseholdRequest newHousehold;

    @NotEmpty(message = "Select at least one resident to move")
    private List<String> residentIds;

    @Pattern(regexp = VietnamDataRules.OPTIONAL_CITIZEN_ID_REGEX,
            message = "Head Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String headIdentityNo;

    private String reason;
}
