package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ResidentRequest {
    @NotBlank(message = "Full name is required")
    @Size(max = 255, message = "Full name must be at most 255 characters")
    private String fullName;

    @Size(max = 20, message = "Gender must be at most 20 characters")
    private String gender;

    private LocalDate dateOfBirth;

    @NotBlank(message = "Citizen ID is required")
    @Pattern(regexp = "^[0-9A-Za-z.-]{6,30}$", message = "Citizen ID must contain 6-30 valid characters")
    private String identityNo;

    @Size(max = 30, message = "Phone must be at most 30 characters")
    private String phone;

    @Size(max = 255, message = "Hometown must be at most 255 characters")
    private String hometown;

    @Size(max = 255, message = "Occupation must be at most 255 characters")
    private String occupation;

    @Size(max = 100, message = "Relationship must be at most 100 characters")
    private String relationshipToHead;

    private String status;

    private String householdId;
}
