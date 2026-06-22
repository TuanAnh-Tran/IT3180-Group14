package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.model.enums.FeeType;
import com.cnpm.apartment.model.enums.PeriodStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.CollectionPeriodRepository;
import com.cnpm.apartment.repository.FeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ReceiptRepository;
import com.cnpm.apartment.service.calculator.CalculatorFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final AssignedFeeRepository assignedFeeRepository;
    private final ReceiptRepository receiptRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final FeeRepository feeRepository;
    private final HouseholdRepository householdRepository;
    private final CalculatorFactory calculatorFactory;

    // =========================================================
    // 1. GHI NHẬN NỘP TIỀN
    // =========================================================

    /**
     * Ghi nhận nộp tiền cho một khoản phí đã gán.
     * - Sử dụng Pessimistic Write Lock để tránh Race Condition.
     * - Hỗ trợ "Thanh toán từng phần" (PARTIAL) và "Thanh toán đủ" (PAID).
     */
    @Transactional
    public ReceiptDTO recordPayment(PaymentRequestDTO request) {
        // Find AssignedFee using Pessimistic Lock
        AssignedFee af = assignedFeeRepository.findByIdForUpdate(request.getAssignedFeeId())
                .orElseThrow(() -> new RuntimeException(
                        "Assigned fee not found with id: " + request.getAssignedFeeId()));

        // Check if already fully paid
        if (af.getStatus() == FeeStatus.PAID) {
            throw new RuntimeException("This fee has already been fully paid.");
        }

        // Tính số tiền phải nộp
        BigDecimal amountRequired = calculateAmount(af);

        // Lấy số tiền người dùng nộp
        BigDecimal userPayment = request.getAmountPaid();
        if (userPayment == null || userPayment.compareTo(BigDecimal.ZERO) <= 0) {
            // Nếu để trống hoặc <= 0, mặc định thanh toán nốt phần còn lại
            BigDecimal currentAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
            userPayment = amountRequired.subtract(currentAccumulated);
            if (userPayment.compareTo(BigDecimal.ZERO) <= 0) {
                userPayment = BigDecimal.ZERO;
            }
        }

        // Lấy tên người dùng hiện tại (từ JWT Security context)
        String currentUser = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        // Cập nhật số tiền lũy kế đã nộp
        BigDecimal currentAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
        BigDecimal newAccumulated = currentAccumulated.add(userPayment);
        af.setAmountPaidAccumulated(newAccumulated);

        // Cập nhật trạng thái
        if (newAccumulated.compareTo(amountRequired) >= 0) {
            af.setStatus(FeeStatus.PAID);
        } else {
            af.setStatus(FeeStatus.PARTIAL);
        }
        af.setPaidAt(LocalDateTime.now());
        assignedFeeRepository.save(af);

        // Tạo biên lai ghi nhận số tiền của giao dịch này
        Receipt receipt = Receipt.builder()
                .id(UUID.randomUUID().toString())
                .assignedFee(af)
                .amountPaid(userPayment)
                .paidAt(LocalDateTime.now())
                .note(request.getNote())
                .createdBy(currentUser)
                .build();
        receiptRepository.save(receipt);

        log.info("Thu phí thành công: householdId={}, feeId={}, amountPaid={}, status={}",
                af.getHousehold().getId(), af.getFee().getId(), userPayment, af.getStatus());

        return mapToReceiptDTO(receipt, amountRequired);
    }

    // =========================================================
    // 2. XEM NỢ / CHƯA NỘP
    // =========================================================

    public Page<AssignedFeeDTO> getUnpaidFees(String periodId, String householdId, Pageable pageable) {
        Page<AssignedFee> page;

        if (periodId != null && householdId != null) {
            // Đối với xem nợ, xem cả UNPAID và PARTIAL
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
    // 4. TẠO ĐỢT THU PHÍ MỚI VÀ QUẢN LÝ CÔNG NỢ LŨY KẾ
    // =========================================================

    /**
     * Tạo một đợt thu phí mới và quét nợ cũ (UNPAID hoặc PARTIAL) để cộng dồn vào đợt này.
     */
    @Transactional
    public CollectionPeriod createPeriod(String id, String name, List<String> feeIds) {
        CollectionPeriod period = CollectionPeriod.builder()
                .id(id)
                .name(name)
                .status(PeriodStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();
        collectionPeriodRepository.save(period);

        List<Household> households = householdRepository.findAll();
        List<Fee> fees = feeRepository.findAllById(feeIds);

        // Đảm bảo Fee nợ cũ FEE_DEBT tồn tại
        Fee debtFee = feeRepository.findById("FEE_DEBT")
                .orElseGet(() -> {
                    Fee f = Fee.builder()
                            .id("FEE_DEBT")
                            .name("Previous Period Debt")
                            .type(FeeType.MANDATORY)
                            .calcMethod(CalcMethod.FIXED)
                            .price(BigDecimal.ONE)
                            .build();
                    return feeRepository.save(f);
                });

        for (Household hh : households) {
            // Quét các khoản còn nợ của đợt cũ
            BigDecimal totalDebt = BigDecimal.ZERO;
            List<AssignedFee> unpaidFees = assignedFeeRepository.findByHouseholdIdAndStatusIn(
                    hh.getId(), List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL));

            for (AssignedFee af : unpaidFees) {
                BigDecimal required = calculateAmount(af);
                BigDecimal paidAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
                BigDecimal debt = required.subtract(paidAccumulated);
                if (debt.compareTo(BigDecimal.ZERO) > 0) {
                    totalDebt = totalDebt.add(debt);
                }
            }

            // Gán phí nợ cũ nếu có
            if (totalDebt.compareTo(BigDecimal.ZERO) > 0) {
                AssignedFee debtAssign = AssignedFee.builder()
                        .id(UUID.randomUUID().toString())
                        .household(hh)
                        .period(period)
                        .fee(debtFee)
                        .quantity(totalDebt.doubleValue())
                        .status(FeeStatus.UNPAID)
                        .amountPaidAccumulated(BigDecimal.ZERO)
                        .build();
                assignedFeeRepository.save(debtAssign);
            }

            // Auto-assign các phí bắt buộc trong đợt thu mới
            for (Fee fee : fees) {
                if (fee.getId().equals("FEE_DEBT")) continue;

                boolean shouldAssign = false;
                double qty = 1.0;

                if (fee.getType() == FeeType.MANDATORY) {
                    shouldAssign = true;
                    if (fee.getCalcMethod() == CalcMethod.PER_PERSON) {
                        qty = hh.getMembersCount();
                    } else if (fee.getCalcMethod() == CalcMethod.PER_M2) {
                        qty = hh.getArea();
                    } else if (fee.getCalcMethod() == CalcMethod.PER_MOTORCYCLE) {
                        qty = hh.getMotorcycleCount();
                    } else if (fee.getCalcMethod() == CalcMethod.PER_CAR) {
                        qty = hh.getCarCount();
                    } else if (fee.getCalcMethod() == CalcMethod.CONSUMPTION) {
                        qty = 0.0; // Chỉ số sẽ được nhập sau
                    }
                } else if (fee.getCalcMethod() == CalcMethod.PER_MOTORCYCLE && hh.getMotorcycleCount() > 0) {
                    shouldAssign = true;
                    qty = hh.getMotorcycleCount();
                } else if (fee.getCalcMethod() == CalcMethod.PER_CAR && hh.getCarCount() > 0) {
                    shouldAssign = true;
                    qty = hh.getCarCount();
                }

                if (shouldAssign) {
                    AssignedFee af = AssignedFee.builder()
                            .id(UUID.randomUUID().toString())
                            .household(hh)
                            .period(period)
                            .fee(fee)
                            .quantity(qty)
                            .status(FeeStatus.UNPAID)
                            .amountPaidAccumulated(BigDecimal.ZERO)
                            .build();
                    assignedFeeRepository.save(af);
                }
            }
        }

        return period;
    }

    // =========================================================
    // HELPER: Tính số tiền phải nộp theo calcMethod sử dụng Strategy Pattern
    // =========================================================

    public BigDecimal calculateAmount(AssignedFee af) {
        return calculatorFactory.getCalculator(af.getFee().getCalcMethod()).calculate(af);
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
                .amountPaidAccumulated(af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO)
                .status(af.getStatus())
                .paidAt(af.getPaidAt())
                .build();
    }

    private ReceiptDTO mapToReceiptDTO(Receipt r, BigDecimal amountRequired) {
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

    /**
     * Hoan tac dong phi cho mot khoan phi da gan.
     * Xoa cac bien lai va reset status ve UNPAID, amountPaidAccumulated ve 0.
     */
    @Transactional
    public void rollbackPayment(String assignedFeeId) {
        AssignedFee af = assignedFeeRepository.findById(assignedFeeId)
                .orElseThrow(() -> new RuntimeException("Assigned fee not found with id: " + assignedFeeId));
        List<Receipt> receipts = receiptRepository.findByAssignedFeeId(assignedFeeId);
        receiptRepository.deleteAll(receipts);

        af.setAmountPaidAccumulated(BigDecimal.ZERO);
        af.setStatus(FeeStatus.UNPAID);
        af.setPaidAt(null);
        assignedFeeRepository.save(af);
    }
}
