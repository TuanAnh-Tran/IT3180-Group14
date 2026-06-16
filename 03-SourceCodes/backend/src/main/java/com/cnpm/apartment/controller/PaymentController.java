package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * POST /api/payments
     * Ghi nhận nộp tiền cho một khoản phí đã gán.
     * Trả về biên lai sau khi thu thành công.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<AssignedFeeDTO>>> getByPeriod(
            @PathVariable String periodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<AssignedFeeDTO> result = paymentService.getByPeriod(periodId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
