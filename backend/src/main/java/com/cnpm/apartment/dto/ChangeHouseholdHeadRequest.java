package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangeHouseholdHeadRequest {
    @NotBlank(message = "Citizen ID of the new household head is required")
    private String identityNo;

    @Size(max = 1000, message = "Reason must be at most 1000 characters")
    private String reason;
}
