package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DemographicsTrendDTO {
    private int month;
    private long newResidents;
    private long temporaryAbsences;
    private long temporaryResidences;
}
