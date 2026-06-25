package com.cnpm.apartment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VehicleDTO {
    private String id;
    private String plateNumber;
    private String type;
    private String ownerName;
    private LocalDate registrationDate;
    private String householdId;
    private String apartmentNo;
}
