package com.cnpm.apartment.dto;

import com.cnpm.apartment.validation.VietnamDataRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class HouseholdRequest {
    @NotBlank(message = "Household code is required")
    @Size(max = 50, message = "Household code must be at most 50 characters")
    private String code;

    @NotBlank(message = "Apartment number is required")
    @Size(max = 50, message = "Apartment number must be at most 50 characters")
    private String apartmentNo;

    @PositiveOrZero(message = "Floor must be zero or greater")
    private Integer floor;

    @Positive(message = "Area must be greater than 0")
    private double area;

    @NotBlank(message = "Household head is required")
    @Size(max = 255, message = "Household head must be at most 255 characters")
    private String headName;

    @Pattern(regexp = VietnamDataRules.OPTIONAL_VIETNAM_MOBILE_REGEX,
            message = "Phone must be a Vietnamese mobile number with 10 digits")
    private String phone;

    @Size(max = 100, message = "House number must be at most 100 characters")
    private String houseNo;

    @Size(max = 255, message = "Street must be at most 255 characters")
    private String street;

    @Size(max = 255, message = "Ward must be at most 255 characters")
    private String ward;

    @Size(max = 255, message = "District must be at most 255 characters")
    private String district;

    @PastOrPresent(message = "Registration date cannot be in the future")
    private LocalDate registrationDate;

    @Pattern(regexp = VietnamDataRules.OPTIONAL_CITIZEN_ID_REGEX,
            message = "Head Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code")
    private String headIdentityNo;

    private String status;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;

    @PositiveOrZero(message = "Motorcycle count must be zero or greater")
    private int motorcycleCount;

    @PositiveOrZero(message = "Car count must be zero or greater")
    private int carCount;
}
