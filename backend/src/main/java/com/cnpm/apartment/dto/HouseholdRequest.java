package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

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

    @PositiveOrZero(message = "Area must be zero or greater")
    private double area;

    @NotBlank(message = "Household head is required")
    @Size(max = 255, message = "Household head must be at most 255 characters")
    private String headName;

    @Size(max = 30, message = "Phone must be at most 30 characters")
    private String phone;

    private String status;

    @Size(max = 1000, message = "Note must be at most 1000 characters")
    private String note;

    @PositiveOrZero(message = "Motorcycle count must be zero or greater")
    private int motorcycleCount;

    @PositiveOrZero(message = "Car count must be zero or greater")
    private int carCount;
}
