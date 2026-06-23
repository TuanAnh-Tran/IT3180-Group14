package com.cnpm.apartment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TemporaryResidenceRequest {
    @NotBlank(message = "Residence record type is required")
    private String type;

    @Size(max = 500, message = "Address must be at most 500 characters")
    private String address;

    private LocalDate startDate;
    private LocalDate endDate;

    @Size(max = 1000, message = "Reason must be at most 1000 characters")
    private String reason;
}
