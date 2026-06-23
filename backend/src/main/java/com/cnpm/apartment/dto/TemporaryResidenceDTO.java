package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TemporaryResidenceDTO {
    private String id;
    private String residentId;
    private String residentName;
    private String type;
    private String address;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private String actor;
    private LocalDateTime createdAt;
}
