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
import java.math.BigDecimal;
import java.util.List;
import com.cnpm.apartment.model.PaymentProof;

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
        return ResponseEntity.ok(ApiResponse.success("Ghi nhận nộp tiền thành công", receipt));
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

    /**
     * POST /api/payments/{receiptId}/cancel
     * Hủy biên lai thanh toán (Hoàn tác nộp tiền).
     */
    @PostMapping("/{receiptId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> cancelReceipt(@PathVariable String receiptId) {
        paymentService.cancelReceipt(receiptId);
        return ResponseEntity.ok(ApiResponse.success("Hủy biên lai thành công", null));
    }

    /**
     * GET /api/payments/qr/{assignedFeeId}
     * Lấy link QR Code VietQR tự động.
     */
    @GetMapping("/qr/{assignedFeeId}")
    public ResponseEntity<ApiResponse<String>> getQrCode(@PathVariable String assignedFeeId) {
        String qrUrl = paymentService.getQrCodeUrl(assignedFeeId);
        return ResponseEntity.ok(ApiResponse.success(qrUrl));
    }

    /**
     * POST /api/payments/proof
     * Resident gửi ảnh giao dịch/minh chứng nộp tiền.
     */
    @PostMapping("/proof")
    public ResponseEntity<ApiResponse<PaymentProof>> submitProof(
            @RequestParam String assignedFeeId,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) String proofImage,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) String payerName) {
        PaymentProof proof = paymentService.submitProof(assignedFeeId, amount, proofImage, note, transactionId, payerName);
        return ResponseEntity.ok(ApiResponse.success("Gửi minh chứng thành công, vui lòng chờ duyệt", proof));
    }

    /**
     * GET /api/payments/proof/pending
     * Kế toán xem danh sách minh chứng chờ duyệt.
     */
    @GetMapping("/proof/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<PaymentProof>>> getPendingProofs() {
        List<PaymentProof> result = paymentService.getPendingProofs();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * POST /api/payments/proof/{proofId}/approve
     * Phê duyệt minh chứng nộp tiền -> Tạo Receipt.
     */
    @PostMapping("/proof/{proofId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ReceiptDTO>> approveProof(
            @PathVariable String proofId,
            @RequestParam(required = false) String note) {
        ReceiptDTO receipt = paymentService.approveProof(proofId, note);
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt minh chứng thành công", receipt));
    }

    /**
     * POST /api/payments/proof/{proofId}/reject
     * Từ chối minh chứng nộp tiền.
     */
    @PostMapping("/proof/{proofId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> rejectProof(
            @PathVariable String proofId,
            @RequestParam(required = false) String note) {
        paymentService.rejectProof(proofId, note);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối minh chứng thanh toán", null));
    }
}
