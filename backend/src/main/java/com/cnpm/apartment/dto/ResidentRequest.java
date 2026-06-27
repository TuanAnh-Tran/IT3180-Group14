package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
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

    @PastOrPresent(message = "Date of birth cannot be in the future")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Citizen ID is required")
    @Pattern(regexp = VietnamDataRules.CITIZEN_ID_REGEX,
            message = "Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String identityNo;

    @Pattern(regexp = VietnamDataRules.OPTIONAL_VIETNAM_MOBILE_REGEX,
            message = "Phone must be a Vietnamese mobile number with 10 digits")
    private String phone;

    @Size(max = 100, message = "Alias must be at most 100 characters")
    private String alias;

    @Size(max = 255, message = "Birth place must be at most 255 characters")
    private String birthPlace;

    @Size(max = 255, message = "Hometown must be at most 255 characters")
    private String hometown;

    @Size(max = 100, message = "Ethnicity must be at most 100 characters")
    private String ethnicity;

    @Size(max = 100, message = "Religion must be at most 100 characters")
    private String religion;

    @Size(max = 255, message = "Occupation must be at most 255 characters")
    private String occupation;

    @Size(max = 255, message = "Workplace must be at most 255 characters")
    private String workplace;

    @PastOrPresent(message = "Citizen ID issue date cannot be in the future")
    private LocalDate issueDate;

    @Size(max = 255, message = "Issue place must be at most 255 characters")
    private String issuePlace;

    @Size(max = 500, message = "Previous residence must be at most 500 characters")
    private String previousResidence;

    @Size(max = 100, message = "Relationship must be at most 100 characters")
    private String relationshipToHead;

    private String status;

    private String householdId;

    private Boolean alive;

    @PastOrPresent(message = "Date of death cannot be in the future")
    private LocalDate dateOfDeath;
}
