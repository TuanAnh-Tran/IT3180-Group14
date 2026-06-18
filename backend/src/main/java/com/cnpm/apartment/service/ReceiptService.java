package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.repository.ReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final PaymentService paymentService;

    // =========================================================
    // LỊCH SỬ ĐÓNG PHÍ
    // =========================================================

    /**
     * Lịch sử đóng phí của một hộ, lọc theo khoảng thời gian.
     */
    public Page<ReceiptDTO> getHistory(String householdId,
                                       LocalDateTime from,
                                       LocalDateTime to,
                                       Pageable pageable) {
        Page<Receipt> page;

        if (householdId != null && from != null && to != null) {
            page = receiptRepository.findByAssignedFeeHouseholdIdAndPaidAtBetween(
                    householdId, from, to, pageable);
        } else if (householdId != null) {
            page = receiptRepository.findByAssignedFeeHouseholdId(householdId, pageable);
        } else if (from != null && to != null) {
            page = receiptRepository.findByPaidAtBetween(from, to, pageable);
        } else {
            page = receiptRepository.findAll(pageable);
        }

        return page.map(this::mapToDTO);
    }

    /**
     * Lấy chi tiết 1 biên lai theo ID.
     */
    public ReceiptDTO getById(String receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("Receipt not found: " + receiptId));
        AssignedFee af = receipt.getAssignedFee();
        BigDecimal amountRequired = paymentService.calculateAmount(af);
        return mapToDTOWithRequired(receipt, amountRequired);
    }

    // =========================================================
    // HELPER: Map Entity → DTO
    // =========================================================

    private ReceiptDTO mapToDTO(Receipt r) {
        AssignedFee af = r.getAssignedFee();
        BigDecimal amountRequired = paymentService.calculateAmount(af);
        return mapToDTOWithRequired(r, amountRequired);
    }

    private ReceiptDTO mapToDTOWithRequired(Receipt r, BigDecimal amountRequired) {
        AssignedFee af = r.getAssignedFee();
        return ReceiptDTO.builder()
                .receiptId(r.getId())
                .householdId(af.getHousehold().getId())
                .ownerName(af.getHousehold().getOwnerName())
                .periodId(af.getPeriod().getId())
                .periodName(af.getPeriod().getName())
                .feeId(af.getFee().getId())
                .feeName(af.getFee().getName())
                .feeType(af.getFee().getType().name())
                .amountRequired(amountRequired)
                .amountPaid(r.getAmountPaid())
                .amountPaidAccumulated(af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO)
                .paidAt(r.getPaidAt())
                .status(af.getStatus())
                .note(r.getNote())
                .createdBy(r.getCreatedBy())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
