package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.repository.ReceiptRepository;
import com.cnpm.apartment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final PaymentService paymentService;
    private final UserRepository userRepository;

    // =========================================================
    // LỊCH SỬ ĐÓNG PHÍ
    // =========================================================

    /**
     * Lịch sử đóng phí của một hộ, lọc theo khoảng thời gian.
     */
    @Transactional(readOnly = true)
    public Page<ReceiptDTO> getHistory(String householdId,
                                       LocalDateTime from,
                                       LocalDateTime to,
                                       Pageable pageable) {
        // Kiểm tra quyền hạn của cư dân (ROLE_user) để giới hạn householdId
        org.springframework.security.core.Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isResident = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_user"));
        if (isResident) {
            String currentUser = authentication.getName();
            User userObj = userRepository.findByUsername(currentUser)
                    .orElseThrow(() -> new RuntimeException("Logged in user not found"));
            householdId = userObj.getRoom();
        }

        Page<Receipt> page;
        boolean hasHousehold = householdId != null && !householdId.trim().isEmpty();

        if (hasHousehold && from != null && to != null) {
            page = receiptRepository.findByAssignedFeeHouseholdIdAndPaidAtBetween(
                    householdId, from, to, pageable);
        } else if (hasHousehold) {
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
    @Transactional(readOnly = true)
    public ReceiptDTO getById(String receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("Receipt not found: " + receiptId));
        AssignedFee af = receipt.getAssignedFee();

        // Kiểm tra quyền hạn cư dân
        org.springframework.security.core.Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isResident = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_user"));
        if (isResident) {
            String currentUser = authentication.getName();
            User userObj = userRepository.findByUsername(currentUser)
                    .orElseThrow(() -> new RuntimeException("Logged in user not found"));
            if (userObj.getRoom() == null || !userObj.getRoom().equals(af.getHousehold().getId())) {
                throw new RuntimeException("You are not authorized to view this receipt.");
            }
        }

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
