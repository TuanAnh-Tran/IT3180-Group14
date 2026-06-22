package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.UtilityRecordDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.UtilityRecord;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.UtilityRecordRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.CollectionPeriodRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/utility-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UtilityRecordController {

    private final UtilityRecordRepository utilityRecordRepository;
    private final AssignedFeeRepository assignedFeeRepository;
    private final HouseholdRepository householdRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<UtilityRecordDTO>>> getUtilityRecords() {
        List<UtilityRecordDTO> list = utilityRecordRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<UtilityRecordDTO>> updateUtilityRecord(@RequestBody UtilityRecordRequest request) {
        // Find existing or build new
        UtilityRecord record = utilityRecordRepository.findByHouseholdIdAndPeriodIdAndType(
                request.getHouseholdId(), request.getPeriodId(), "WATER")
                .orElse(null);

        if (record == null) {
            record = new UtilityRecord();
            record.setId(request.getId() != null ? request.getId() : "UT-" + System.currentTimeMillis());
            Household hh = householdRepository.findById(request.getHouseholdId())
                    .orElseThrow(() -> new RuntimeException("Household not found"));
            CollectionPeriod p = collectionPeriodRepository.findById(request.getPeriodId())
                    .orElseThrow(() -> new RuntimeException("Period not found"));
            record.setHousehold(hh);
            record.setPeriod(p);
            record.setType("WATER");
        }

        record.setOldIndex(request.getOldIndex());
        record.setNewIndex(request.getNewIndex());

        utilityRecordRepository.save(record);

        // Find assigned fee for this household, period, and feeId to update its quantity
        if (request.getFeeId() != null) {
            assignedFeeRepository.findByPeriodIdAndHouseholdId(request.getPeriodId(), request.getHouseholdId())
                    .stream()
                    .filter(af -> af.getFee().getId().equals(request.getFeeId()))
                    .findFirst()
                    .ifPresent(af -> {
                        af.setQuantity(request.getNewIndex() - request.getOldIndex());
                        assignedFeeRepository.save(af);
                    });
        }

        return ResponseEntity.ok(ApiResponse.success(mapToDTO(record)));
    }

    private UtilityRecordDTO mapToDTO(UtilityRecord ur) {
        return UtilityRecordDTO.builder()
                .id(ur.getId())
                .householdId(ur.getHousehold() != null ? ur.getHousehold().getId() : null)
                .periodId(ur.getPeriod() != null ? ur.getPeriod().getId() : null)
                .type(ur.getType())
                .oldIndex(ur.getOldIndex())
                .newIndex(ur.getNewIndex())
                .build();
    }

    @Data
    public static class UtilityRecordRequest {
        private String id;
        private String householdId;
        private String periodId;
        private String feeId;
        private int oldIndex;
        private int newIndex;
    }
}
