package com.cnpm.apartment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResidentStatsDTO {
    private long totalHouseholds;
    private long totalResidents;
    private long occupiedHouseholds;
    private long vacantHouseholds;
    private long permanentResidents;
    private long temporaryResidents;
    private long temporarilyAwayResidents;
    private long movedOutResidents;
}
