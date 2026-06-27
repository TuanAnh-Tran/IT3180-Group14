package com.cnpm.apartment.controller;

import com.cnpm.apartment.dto.ApiResponse;
import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.model.PaymentProof;
import com.cnpm.apartment.model.enums.PeriodStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.CollectionPeriodRepository;
import com.cnpm.apartment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final AssignedFeeRepository assignedFeeRepository;

    public record PeriodDTO(String id, String name, List<String> feeIds, String status,
                            java.time.LocalDateTime createdAt) {}

    public record PaymentProofDTO(
            String id,
            String assignedFeeId,
            String householdId,
            String ownerName,
            String feeName,
            BigDecimal amount,
            String proofImage,
            String status,
            java.time.LocalDateTime submittedAt,
            String note,
            String transactionId,
            String payerName) {}

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ReceiptDTO>> recordPayment(
            @Valid @RequestBody PaymentRequestDTO request) {
        ReceiptDTO receipt = paymentService.recordPayment(request);
        return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", receipt));
    }

    @GetMapping("/unpaid")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<AssignedFeeDTO>>> getUnpaid(
            @RequestParam(required = false) String periodId,
            @RequestParam(required = false) String householdId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("household.ownerName"));
        Page<AssignedFeeDTO> result = paymentService.getUnpaidFees(periodId, householdId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/by-period/{periodId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<AssignedFeeDTO>>> getByPeriod(
            @PathVariable String periodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        Page<AssignedFeeDTO> result = paymentService.getByPeriod(periodId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/periods")
    public ResponseEntity<ApiResponse<List<PeriodDTO>>> getPeriods() {
        List<PeriodDTO> result = collectionPeriodRepository.findAll().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null && b.getCreatedAt() == null) {
                        return a.getId().compareTo(b.getId());
                    }
                    if (a.getCreatedAt() == null) {
                        return 1;
                    }
                    if (b.getCreatedAt() == null) {
                        return -1;
                    }
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .map(this::mapPeriod)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/periods")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PeriodDTO>> createPeriod(@RequestBody Map<String, Object> request) {
        String name = String.valueOf(request.getOrDefault("name", "")).trim();
        if (name.isBlank()) {
            throw new RuntimeException("Collection period name is required.");
        }
        if (collectionPeriodRepository.existsByNameIgnoreCase(name)) {
            throw new RuntimeException("Collection period name already exists.");
        }

        List<String> feeIds = List.of();
        Object feeIdsValue = request.get("feeIds");
        if (feeIdsValue instanceof List<?> list) {
            feeIds = list.stream()
                    .map(String::valueOf)
                    .filter(value -> !value.isBlank())
                    .distinct()
                    .toList();
        }
        if (feeIds.isEmpty()) {
            throw new RuntimeException("Select at least one fee for the collection period.");
        }

        String id = "PER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CollectionPeriod period = paymentService.createPeriod(id, name, feeIds);
        return ResponseEntity.ok(ApiResponse.success("Collection period created successfully", mapPeriod(period)));
    }

    @PostMapping("/periods/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PeriodDTO>> closePeriod(@PathVariable String id) {
        CollectionPeriod period = collectionPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Collection period not found: " + id));
        period.setStatus(PeriodStatus.CLOSED);
        return ResponseEntity.ok(ApiResponse.success("Collection period closed successfully",
                mapPeriod(collectionPeriodRepository.save(period))));
    }

    @PostMapping("/periods/{id}/reopen")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PeriodDTO>> reopenPeriod(@PathVariable String id) {
        CollectionPeriod period = collectionPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Collection period not found: " + id));
        period.setStatus(PeriodStatus.OPEN);
        return ResponseEntity.ok(ApiResponse.success("Collection period reopened successfully",
                mapPeriod(collectionPeriodRepository.save(period))));
    }

    @PostMapping("/{receiptId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> cancelReceipt(@PathVariable String receiptId) {
        paymentService.cancelReceipt(receiptId);
        return ResponseEntity.ok(ApiResponse.success("Receipt cancelled successfully", null));
    }

    @GetMapping("/qr/{assignedFeeId}")
    public ResponseEntity<ApiResponse<String>> getQrCode(@PathVariable String assignedFeeId) {
        String qrUrl = paymentService.getQrCodeUrl(assignedFeeId);
        return ResponseEntity.ok(ApiResponse.success(qrUrl));
    }

    @PostMapping("/proof")
    public ResponseEntity<ApiResponse<PaymentProofDTO>> submitProof(
            @RequestParam String assignedFeeId,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) String proofImage,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) String transactionId,
            @RequestParam(required = false) String payerName) {
        PaymentProofDTO proof = mapProof(paymentService.submitProof(
                assignedFeeId, amount, proofImage, note, transactionId, payerName));
        return ResponseEntity.ok(ApiResponse.success(
                "Payment proof submitted successfully. Please wait for approval.", proof));
    }

    @GetMapping("/proof/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<PaymentProofDTO>>> getPendingProofs() {
        List<PaymentProofDTO> result = paymentService.getPendingProofs().stream()
                .map(this::mapProof)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/proof/{proofId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ReceiptDTO>> approveProof(
            @PathVariable String proofId,
            @RequestParam(required = false) String note) {
        ReceiptDTO receipt = paymentService.approveProof(proofId, note);
        return ResponseEntity.ok(ApiResponse.success("Payment proof approved successfully", receipt));
    }

    @PostMapping("/proof/{proofId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> rejectProof(
            @PathVariable String proofId,
            @RequestParam(required = false) String note) {
        paymentService.rejectProof(proofId, note);
        return ResponseEntity.ok(ApiResponse.success("Payment proof rejected successfully", null));
    }

    private PeriodDTO mapPeriod(CollectionPeriod period) {
        return new PeriodDTO(
                period.getId(),
                period.getName(),
                assignedFeeRepository.findDistinctFeeIdsByPeriodId(period.getId()),
                period.getStatus().name(),
                period.getCreatedAt());
    }

    private PaymentProofDTO mapProof(PaymentProof proof) {
        AssignedFee assignedFee = proof.getAssignedFee();
        return new PaymentProofDTO(
                proof.getId(),
                assignedFee.getId(),
                assignedFee.getHousehold().getId(),
                assignedFee.getHousehold().getOwnerName(),
                assignedFee.getFee().getName(),
                proof.getAmount(),
                proof.getProofImage(),
                proof.getStatus().name(),
                proof.getSubmittedAt(),
                proof.getNote(),
                proof.getTransactionId(),
                proof.getPayerName());
    }
}
