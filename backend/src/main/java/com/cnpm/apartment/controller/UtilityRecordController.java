package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.UtilityRecord;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.CollectionPeriodRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.UtilityRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import com.cnpm.apartment.model.enums.PeriodStatus;

@RestController
@RequestMapping("/api/utility-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UtilityRecordController {

    private final UtilityRecordRepository utilityRecordRepository;
    private final HouseholdRepository householdRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final AssignedFeeRepository assignedFeeRepository;

    public record UtilityRecordDTO(
            String id,
            String householdId,
            String periodId,
            String periodName,
            String type,
            int oldIndexBefore,
            int oldIndexAfter,
            int newIndexBefore,
            int newIndexAfter,
            String modifiedBy,
            LocalDateTime modifiedAt) {}

    @PostMapping("/update")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<UtilityRecordDTO>> updateRecord(@RequestBody Map<String, Object> request) {
        String householdId = stringValue(request.get("householdId"));
        String periodId = stringValue(request.get("periodId"));
        String feeId = stringValue(request.get("feeId"));
        int oldIndex = intValue(request.get("oldIndex"));
        int newIndex = intValue(request.get("newIndex"));
        if (oldIndex < 0 || newIndex < 0) {
            throw new RuntimeException("Utility indexes must be zero or greater.");
        }
        if (newIndex < oldIndex) {
            throw new RuntimeException("New utility index must be greater than or equal to old index.");
        }

        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new RuntimeException("Household not found: " + householdId));
        CollectionPeriod period = collectionPeriodRepository.findById(periodId)
                .orElseThrow(() -> new RuntimeException("Collection period not found: " + periodId));
        if (period.getStatus() == PeriodStatus.CLOSED) {
            throw new RuntimeException("This collection period is closed. Utility indexes cannot be changed.");
        }

        UtilityRecord record = utilityRecordRepository
                .findByHouseholdIdAndPeriodIdAndType(householdId, periodId, "WATER")
                .orElseGet(() -> UtilityRecord.builder()
                        .id("UR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                        .household(household)
                        .period(period)
                        .type("WATER")
                        .oldIndex(0)
                        .newIndex(0)
                        .build());

        int oldBefore = record.getOldIndex();
        int newBefore = record.getNewIndex();
        record.setOldIndex(oldIndex);
        record.setNewIndex(newIndex);
        UtilityRecord saved = utilityRecordRepository.save(record);

        if (!feeId.isBlank()) {
            assignedFeeRepository.findByHouseholdIdAndPeriodIdAndFeeId(householdId, periodId, feeId)
                    .ifPresent(assignedFee -> updateConsumptionQuantity(assignedFee, oldIndex, newIndex));
        }

        return ResponseEntity.ok(ApiResponse.success("Utility index updated successfully",
                mapRecord(saved, oldBefore, newBefore, currentUsername())));
    }

    private void updateConsumptionQuantity(AssignedFee assignedFee, int oldIndex, int newIndex) {
        assignedFee.setQuantity(Math.max(0, newIndex - oldIndex));
        assignedFeeRepository.save(assignedFee);
    }

    private UtilityRecordDTO mapRecord(UtilityRecord record, int oldBefore, int newBefore, String modifiedBy) {
        return new UtilityRecordDTO(
                record.getId(),
                record.getHousehold().getId(),
                record.getPeriod().getId(),
                record.getPeriod().getName(),
                record.getType(),
                oldBefore,
                record.getOldIndex(),
                newBefore,
                record.getNewIndex(),
                modifiedBy,
                LocalDateTime.now());
    }

    private String currentUsername() {
        try {
            return SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception e) {
            return "system";
        }
    }

    private int intValue(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return 0;
        }
        return Integer.parseInt(String.valueOf(value));
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
