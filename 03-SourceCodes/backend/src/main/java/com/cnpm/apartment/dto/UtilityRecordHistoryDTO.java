package com.cnpm.apartment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilityRecordHistoryDTO {
    private String id;
    private String householdId;
    private String periodId;
    private String periodName;
    private String type;
    private int oldIndexBefore;
    private int newIndexBefore;
    private int oldIndexAfter;
    private int newIndexAfter;
    private String modifiedBy;
    private LocalDateTime modifiedAt;
}
