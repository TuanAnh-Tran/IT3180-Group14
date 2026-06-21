package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.model.enums.PeriodStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.CollectionPeriodRepository;
import com.cnpm.apartment.service.PaymentService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/collection-periods")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CollectionPeriodController {

    private final CollectionPeriodRepository collectionPeriodRepository;
    private final AssignedFeeRepository assignedFeeRepository;
    private final PaymentService paymentService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<CollectionPeriod>>> getPeriods() {
        List<CollectionPeriod> periods = collectionPeriodRepository.findAll();
        for (CollectionPeriod p : periods) {
            p.setFeeIds(assignedFeeRepository.findFeeIdsByPeriodId(p.getId()));
        }
        return ResponseEntity.ok(ApiResponse.success(periods));
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<CollectionPeriod>> createPeriod(@RequestBody CreatePeriodRequest request) {
        String id = request.getId();
        if (id == null || id.isEmpty()) {
            id = "PER-" + System.currentTimeMillis();
        }
        CollectionPeriod period = paymentService.createPeriod(id, request.getName(), request.getFeeIds());
        period.setFeeIds(request.getFeeIds());
        return ResponseEntity.ok(ApiResponse.success(period));
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> closePeriod(@PathVariable String id) {
        CollectionPeriod period = collectionPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Period not found"));
        period.setStatus(PeriodStatus.CLOSED);
        collectionPeriodRepository.save(period);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Data
    public static class CreatePeriodRequest {
        private String id;
        private String name;
        private List<String> feeIds;
    }
}
