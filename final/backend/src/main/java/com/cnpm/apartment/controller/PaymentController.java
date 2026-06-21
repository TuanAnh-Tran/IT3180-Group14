package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.service.PaymentService;
import com.cnpm.apartment.model.*;
import com.cnpm.apartment.repository.*;
import com.cnpm.apartment.model.enums.FeeStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;
    private final HouseholdRepository householdRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final FeeRepository feeRepository;
    private final AssignedFeeRepository assignedFeeRepository;

    /**
     * POST /api/payments
     * Ghi nhận nộp tiền cho một khoản phí đã gán.
     * Trả về biên lai sau khi thu thành công.
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<ReceiptDTO>> recordPayment(
            @Valid @RequestBody PaymentRequestDTO request) {
        ReceiptDTO receipt = paymentService.recordPayment(request);
        return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", receipt));
    }

    /**
     * GET /api/payments/unpaid
     * Lấy danh sách khoản phí chưa nộp.
     * Filter: periodId, householdId, page, size
     */
    @GetMapping("/unpaid")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant', 'ROLE_user')")
    public ResponseEntity<ApiResponse<Page<AssignedFeeDTO>>> getUnpaid(
            @RequestParam(required = false) String periodId,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("household.ownerName"));
        Page<AssignedFeeDTO> result = paymentService.getUnpaidFees(periodId, householdId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /api/payments/by-period/{periodId}
     * Lấy toàn bộ danh sách phí (cả PAID + UNPAID) theo đợt thu.
     */
    @GetMapping("/by-period/{periodId}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<Page<AssignedFeeDTO>>> getByPeriod(
            @PathVariable String periodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<AssignedFeeDTO> result = paymentService.getByPeriod(periodId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/assigned-fees")
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<AssignedFeeDTO>> assignFee(@RequestBody Map<String, Object> request) {
        String hhId = (String) request.get("householdId");
        String pId = (String) request.get("periodId");
        String fId = (String) request.get("feeId");
        double qty = request.containsKey("quantity") ? ((Number) request.get("quantity")).doubleValue() : 1.0;

        Household hh = householdRepository.findById(hhId).orElseThrow(() -> new RuntimeException("Household not found"));
        CollectionPeriod p = collectionPeriodRepository.findById(pId).orElseThrow(() -> new RuntimeException("Period not found"));
        Fee f = feeRepository.findById(fId).orElseThrow(() -> new RuntimeException("Fee not found"));

        AssignedFee af = AssignedFee.builder()
                .id(UUID.randomUUID().toString())
                .household(hh)
                .period(p)
                .fee(f)
                .quantity(qty)
                .status(FeeStatus.UNPAID)
                .amountPaidAccumulated(BigDecimal.ZERO)
                .build();

        AssignedFee saved = assignedFeeRepository.save(af);
        return ResponseEntity.ok(ApiResponse.success(paymentService.mapToAssignedFeeDTO(saved)));
    }

    @DeleteMapping("/assigned-fees/{hhId}/{pId}/{fId}")
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public ResponseEntity<ApiResponse<Void>> unassignFee(
            @PathVariable String hhId,
            @PathVariable String pId,
            @PathVariable String fId) {

        List<AssignedFee> list = assignedFeeRepository.findByPeriodIdAndHouseholdId(pId, hhId);
        for (AssignedFee af : list) {
            if (af.getFee().getId().equals(fId)) {
                assignedFeeRepository.delete(af);
            }
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * DELETE /api/payments/{assignedFeeId}
     * Huy/Hoan tac dong phi cho mot khoan phi da gan.
     */
    @DeleteMapping("/{assignedFeeId}")
    @PreAuthorize("hasAnyAuthority('ROLE_admin', 'ROLE_accountant')")
    public ResponseEntity<ApiResponse<Void>> rollbackPayment(@PathVariable String assignedFeeId) {
        paymentService.rollbackPayment(assignedFeeId);
        return ResponseEntity.ok(ApiResponse.success("Payment rolled back successfully", null));
    }
}
