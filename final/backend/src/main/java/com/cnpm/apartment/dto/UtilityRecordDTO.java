package com.cnpm.apartment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UtilityRecordDTO {
    private String id;
    private String householdId;
    private String periodId;
    private String type;
    private int oldIndex;
    private int newIndex;
}
