package com.cnpm.apartment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SplitHouseholdRequest {
    @Valid
    private HouseholdRequest newHousehold;

    @NotEmpty(message = "Select at least one resident to move")
    private List<String> residentIds;

    private String headIdentityNo;
    private String reason;
}
