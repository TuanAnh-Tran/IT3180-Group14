package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.ReceiptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final AssignedFeeRepository assignedFeeRepository;
    private final ReceiptRepository receiptRepository;

    // =========================================================
    // 1. GHI NHẬN NỘP TIỀN
    // =========================================================

    /**
     * Ghi nhận nộp tiền cho một khoản phí đã gán.
     * - Cập nhật status của AssignedFee → PAID
     * - Tạo bản ghi Receipt (biên lai)
     */
    @Transactional
    public ReceiptDTO recordPayment(PaymentRequestDTO request) {
        // Tìm AssignedFee
        AssignedFee af = assignedFeeRepository.findById(request.getAssignedFeeId())
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy khoản phí với id: " + request.getAssignedFeeId()));

        // Kiểm tra đã nộp chưa
        if (af.getStatus() == FeeStatus.PAID) {
            throw new RuntimeException("Khoản phí này đã được thanh toán trước đó.");
        }

        // Tính số tiền phải nộp
        double amountRequired = calculateAmount(af);

        // Lấy tên người dùng hiện tại (từ JWT Security context)
        String currentUser = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        // Cập nhật trạng thái AssignedFee
        af.setStatus(FeeStatus.PAID);
        af.setPaidAt(LocalDateTime.now());
        assignedFeeRepository.save(af);

        // Tạo biên lai
        Receipt receipt = Receipt.builder()
                .id(UUID.randomUUID().toString())
                .assignedFee(af)
                .amountPaid(request.getAmountPaid())
                .paidAt(LocalDateTime.now())
                .note(request.getNote())
                .createdBy(currentUser)
                .build();
        receiptRepository.save(receipt);

        log.info("Thu phí thành công: householdId={}, feeId={}, amount={}",
                af.getHousehold().getId(), af.getFee().getId(), request.getAmountPaid());

        return mapToReceiptDTO(receipt, amountRequired);
    }

    // =========================================================
    // 2. XEM NỢ / CHƯA NỘP
    // =========================================================

    public Page<AssignedFeeDTO> getUnpaidFees(String periodId, String householdId, Pageable pageable) {
        Page<AssignedFee> page;

        if (periodId != null && householdId != null) {
            page = assignedFeeRepository.findByPeriodIdAndHouseholdIdAndStatus(
                    periodId, householdId, FeeStatus.UNPAID, pageable);
        } else if (periodId != null) {
            page = assignedFeeRepository.findByPeriodIdAndStatus(periodId, FeeStatus.UNPAID, pageable);
        } else if (householdId != null) {
            page = assignedFeeRepository.findByHouseholdIdAndStatus(householdId, FeeStatus.UNPAID)
                    .stream().collect(java.util.stream.Collectors.collectingAndThen(
                            java.util.stream.Collectors.toList(),
                            list -> new org.springframework.data.domain.PageImpl<>(list, pageable, list.size())));
        } else {
            page = assignedFeeRepository.findByStatus(FeeStatus.UNPAID, pageable);
        }

        return page.map(this::mapToAssignedFeeDTO);
    }

    // =========================================================
    // 3. DANH SÁCH TẤT CẢ PHÍ THEO ĐỢT (bao gồm PAID + UNPAID)
    // =========================================================

    public Page<AssignedFeeDTO> getByPeriod(String periodId, Pageable pageable) {
        return assignedFeeRepository.findByPeriodId(periodId, pageable)
                .map(this::mapToAssignedFeeDTO);
    }

    // =========================================================
    // HELPER: Tính số tiền phải nộp theo calcMethod
    // =========================================================

    public double calculateAmount(AssignedFee af) {
        Household hh = af.getHousehold();
        double price = af.getFee().getPrice();
        CalcMethod method = af.getFee().getCalcMethod();

        return switch (method) {
            case FIXED      -> price;
            case PER_PERSON -> price * hh.getMembersCount();
            case PER_M2     -> price * hh.getArea();
            case PER_VEHICLE -> price * af.getQuantity();
        };
    }

    // =========================================================
    // HELPER: Map Entity → DTO
    // =========================================================

    public AssignedFeeDTO mapToAssignedFeeDTO(AssignedFee af) {
        Household hh = af.getHousehold();
        return AssignedFeeDTO.builder()
                .id(af.getId())
                .householdId(hh.getId())
                .ownerName(hh.getOwnerName())
                .membersCount(hh.getMembersCount())
                .area(hh.getArea())
                .motorcycleCount(hh.getMotorcycleCount())
                .carCount(hh.getCarCount())
                .periodId(af.getPeriod().getId())
                .periodName(af.getPeriod().getName())
                .feeId(af.getFee().getId())
                .feeName(af.getFee().getName())
                .feeType(af.getFee().getType().name())
                .calcMethod(af.getFee().getCalcMethod().name())
                .unitPrice(af.getFee().getPrice())
                .quantity(af.getQuantity())
                .amountRequired(calculateAmount(af))
                .status(af.getStatus())
                .paidAt(af.getPaidAt())
                .build();
    }

    private ReceiptDTO mapToReceiptDTO(Receipt r, double amountRequired) {
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
                .paidAt(r.getPaidAt())
                .status(af.getStatus())
                .note(r.getNote())
                .createdBy(r.getCreatedBy())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
