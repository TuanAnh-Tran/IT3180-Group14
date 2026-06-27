package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.model.AssignedFee;
import com.cnpm.apartment.model.CollectionPeriod;
import com.cnpm.apartment.model.Fee;
import com.cnpm.apartment.model.Household;
import com.cnpm.apartment.model.Receipt;
import com.cnpm.apartment.model.PaymentProof;
import com.cnpm.apartment.model.enums.CalcMethod;
import com.cnpm.apartment.model.enums.FeeStatus;
import com.cnpm.apartment.model.enums.FeeType;
import com.cnpm.apartment.model.enums.PeriodStatus;
import com.cnpm.apartment.repository.AssignedFeeRepository;
import com.cnpm.apartment.repository.CollectionPeriodRepository;
import com.cnpm.apartment.repository.FeeRepository;
import com.cnpm.apartment.repository.HouseholdRepository;
import com.cnpm.apartment.repository.ReceiptRepository;
import com.cnpm.apartment.repository.ResidentRepository;
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
public class PaymentService {

    private final AssignedFeeRepository assignedFeeRepository;
    private final ReceiptRepository receiptRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final FeeRepository feeRepository;
    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final CalculatorFactory calculatorFactory;
    private final com.cnpm.apartment.repository.PaymentProofRepository paymentProofRepository;

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
        // Idempotency check
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            java.util.Optional<Receipt> existing = receiptRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existing.isPresent()) {
                Receipt r = existing.get();
                BigDecimal amountRequired = calculateAmount(r.getAssignedFee());
                return mapToReceiptDTO(r, amountRequired);
            }
        }

        // Find AssignedFee using Pessimistic Lock
        AssignedFee af = assignedFeeRepository.findByIdForUpdate(request.getAssignedFeeId())
                .orElseThrow(() -> new RuntimeException(
                        "Assigned fee not found with id: " + request.getAssignedFeeId()));

        // Check if already fully paid
        if (af.getStatus() == FeeStatus.PAID) {
            throw new RuntimeException("This fee has already been fully paid.");
        }
        if (af.getPeriod().getStatus() == PeriodStatus.CLOSED) {
            throw new RuntimeException("This collection period is closed. Payment is not allowed.");
        }

        // Tính số tiền phải nộp
        BigDecimal amountRequired = calculateAmount(af);
        BigDecimal currentAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
        BigDecimal remaining = amountRequired.subtract(currentAccumulated);

        Household hh = af.getHousehold();
        BigDecimal balance = BigDecimal.ZERO;

        BigDecimal userPayment = request.getAmountPaid();
        if (userPayment == null) {
            throw new RuntimeException("Payment amount is required.");
        }
        if (userPayment.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than 0.");
        }
        if (userPayment.compareTo(remaining) > 0) {
            throw new RuntimeException("Payment amount cannot exceed the remaining debt.");
        }
        BigDecimal balanceApplied = BigDecimal.ZERO;

        if (userPayment == null || userPayment.compareTo(BigDecimal.ZERO) <= 0) {
            // Mặc định thanh toán nốt phần còn lại
            if (balance.compareTo(remaining) >= 0) {
                balanceApplied = remaining;
                userPayment = BigDecimal.ZERO;
            } else {
                balanceApplied = balance;
                userPayment = remaining.subtract(balance);
            }
        } else {
            // Người dùng nhập số tiền cụ thể
            BigDecimal totalAvailable = userPayment.add(balance);
            if (totalAvailable.compareTo(remaining) >= 0) {
                balanceApplied = balance;
                BigDecimal newBalance = totalAvailable.subtract(remaining);
                hh.setBalance(newBalance);
                userPayment = remaining;
                balanceApplied = remaining.subtract(request.getAmountPaid());
                if (balanceApplied.compareTo(BigDecimal.ZERO) < 0) {
                    balanceApplied = BigDecimal.ZERO;
                }
            } else {
                balanceApplied = balance;
                hh.setBalance(BigDecimal.ZERO);
            }
        }

        // Cập nhật số dư hộ nếu sử dụng balance
        if (balanceApplied.compareTo(BigDecimal.ZERO) > 0 && userPayment.compareTo(remaining) < 0) {
            BigDecimal usedFromBalance = balanceApplied;
            if (usedFromBalance.compareTo(balance) > 0) {
                usedFromBalance = balance;
            }
            hh.setBalance(balance.subtract(usedFromBalance));
        }


        // Cập nhật số tiền lũy kế đã nộp
        BigDecimal actualAppliedToFee = request.getAmountPaid() != null ? request.getAmountPaid() : remaining;
        if (balance.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal totalApplied = actualAppliedToFee.add(balance);
            if (totalApplied.compareTo(remaining) >= 0) {
                actualAppliedToFee = remaining;
            } else {
                actualAppliedToFee = totalApplied;
            }
        } else {
            if (actualAppliedToFee.compareTo(remaining) > 0) {
                actualAppliedToFee = remaining;
            }
        }

        BigDecimal newAccumulated = currentAccumulated.add(actualAppliedToFee);
        af.setAmountPaidAccumulated(newAccumulated);

        // Cập nhật trạng thái
        if (newAccumulated.compareTo(amountRequired) >= 0) {
            af.setStatus(FeeStatus.PAID);
        } else {
            af.setStatus(FeeStatus.PARTIAL);
        }

        LocalDateTime paymentDate = request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now();
        af.setPaidAt(paymentDate);
        assignedFeeRepository.save(af);
        householdRepository.save(hh);

        // Lấy tên người dùng hiện tại (từ JWT Security context)
        String currentUser = "system";
        try {
            currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception e) {
            // fallback
        }

        // Tạo biên lai ghi nhận số tiền của giao dịch này
        Receipt receipt = Receipt.builder()
                .id(UUID.randomUUID().toString())
                .assignedFee(af)
                .amountPaid(request.getAmountPaid() != null ? request.getAmountPaid() : actualAppliedToFee)
                .paidAt(paymentDate)
                .note(request.getNote())
                .createdBy(currentUser)
                .payerName(request.getPayerName())
                .status(com.cnpm.apartment.model.enums.ReceiptStatus.ACTIVE)
                .idempotencyKey(request.getIdempotencyKey())
                .build();
        receiptRepository.save(receipt);

        log.info("Thu phí thành công: householdId={}, feeId={}, amountPaid={}, status={}",
                af.getHousehold().getId(), af.getFee().getId(), receipt.getAmountPaid(), af.getStatus());

        return mapToReceiptDTO(receipt, amountRequired);
    }

    @Transactional
    public void cancelReceipt(String receiptId) {
        Receipt r = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("Receipt not found with id: " + receiptId));

        if (r.getStatus() == com.cnpm.apartment.model.enums.ReceiptStatus.CANCELLED) {
            throw new RuntimeException("Receipt is already cancelled.");
        }

        r.setStatus(com.cnpm.apartment.model.enums.ReceiptStatus.CANCELLED);
        receiptRepository.save(r);

        AssignedFee af = r.getAssignedFee();
        BigDecimal amountPaidOnReceipt = r.getAmountPaid();

        BigDecimal currentAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
        BigDecimal amountRequired = calculateAmount(af);

        BigDecimal newAccumulated = currentAccumulated.subtract(amountPaidOnReceipt);
        BigDecimal excessAppliedToBalance = BigDecimal.ZERO;
        if (newAccumulated.compareTo(BigDecimal.ZERO) < 0) {
            excessAppliedToBalance = newAccumulated.negate();
            newAccumulated = BigDecimal.ZERO;
        } else if (newAccumulated.compareTo(amountRequired) > 0) {
            excessAppliedToBalance = newAccumulated.subtract(amountRequired);
            newAccumulated = amountRequired;
        }

        af.setAmountPaidAccumulated(newAccumulated);

        if (newAccumulated.compareTo(BigDecimal.ZERO) <= 0) {
            af.setStatus(FeeStatus.UNPAID);
            af.setPaidAt(null);
        } else if (newAccumulated.compareTo(amountRequired) >= 0) {
            af.setStatus(FeeStatus.PAID);
        } else {
            af.setStatus(FeeStatus.PARTIAL);
        }
        assignedFeeRepository.save(af);

        if (excessAppliedToBalance.compareTo(BigDecimal.ZERO) > 0) {
            Household hh = af.getHousehold();
            BigDecimal currentBalance = hh.getBalance() != null ? hh.getBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = currentBalance.subtract(excessAppliedToBalance);
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                newBalance = BigDecimal.ZERO;
            }
            hh.setBalance(newBalance);
            householdRepository.save(hh);
        }

        log.info("Hủy biên lai thành công: receiptId={}, assignedFeeId={}", receiptId, af.getId());
    }

    // =================================────────────────========
    // PAYMENT PROOF LOGIC
    // =================================────────────────========

    @Transactional
    public PaymentProof submitProof(String assignedFeeId, BigDecimal amount, String proofImage, String note, String transactionId, String payerName) {
        AssignedFee af = assignedFeeRepository.findById(assignedFeeId)
                .orElseThrow(() -> new RuntimeException("Assigned fee not found."));
        af.getHousehold().getId();
        af.getHousehold().getOwnerName();
        af.getFee().getName();
        if (af.getStatus() == FeeStatus.PAID) {
            throw new RuntimeException("This fee has already been fully paid.");
        }
        if (af.getPeriod().getStatus() == PeriodStatus.CLOSED) {
            throw new RuntimeException("This collection period is closed. Payment proof is not allowed.");
        }
        if (amount == null) {
            throw new RuntimeException("Proof amount is required.");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Proof amount must be greater than 0.");
        }
        BigDecimal amountRequired = calculateAmount(af);
        BigDecimal paid = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
        BigDecimal remaining = amountRequired.subtract(paid);
        if (amount.compareTo(remaining) > 0) {
            throw new RuntimeException("Proof amount cannot exceed the remaining debt.");
        }
        if (paymentProofRepository.existsByAssignedFeeIdAndStatus(assignedFeeId, PaymentProof.ProofStatus.PENDING)) {
            throw new RuntimeException("A pending payment proof already exists for this fee.");
        }
        String normalizedTransactionId = transactionId == null ? "" : transactionId.trim();
        if (!normalizedTransactionId.isBlank() && paymentProofRepository.existsByTransactionIdIgnoreCase(normalizedTransactionId)) {
            throw new RuntimeException("Transaction ID is already used by another payment proof.");
        }

        PaymentProof proof = PaymentProof.builder()
                .id("PRF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .assignedFee(af)
                .amount(amount)
                .proofImage(proofImage)
                .note(note)
                .transactionId(normalizedTransactionId)
                .payerName(payerName)
                .status(PaymentProof.ProofStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .build();

        return paymentProofRepository.save(proof);
    }

    @Transactional(readOnly = true)
    public List<PaymentProof> getPendingProofs() {
        return paymentProofRepository.findByStatusWithDetails(PaymentProof.ProofStatus.PENDING);
    }

    @Transactional
    public ReceiptDTO approveProof(String proofId, String note) {
        PaymentProof proof = paymentProofRepository.findById(proofId)
                .orElseThrow(() -> new RuntimeException("Proof not found."));

        if (proof.getStatus() != PaymentProof.ProofStatus.PENDING) {
            throw new RuntimeException("Proof is already processed.");
        }

        proof.setStatus(PaymentProof.ProofStatus.APPROVED);
        paymentProofRepository.save(proof);

        PaymentRequestDTO req = new PaymentRequestDTO();
        req.setAssignedFeeId(proof.getAssignedFee().getId());
        req.setAmountPaid(proof.getAmount());
        req.setNote(note != null && !note.isBlank() ? note : proof.getNote());
        req.setPayerName(proof.getPayerName());
        req.setPaidAt(proof.getSubmittedAt());

        return recordPayment(req);
    }

    @Transactional
    public void rejectProof(String proofId, String note) {
        PaymentProof proof = paymentProofRepository.findById(proofId)
                .orElseThrow(() -> new RuntimeException("Proof not found."));

        if (proof.getStatus() != PaymentProof.ProofStatus.PENDING) {
            throw new RuntimeException("Proof is already processed.");
        }

        proof.setStatus(PaymentProof.ProofStatus.REJECTED);
        proof.setNote(note);
        paymentProofRepository.save(proof);
    }

    @Transactional(readOnly = true)
    public String getQrCodeUrl(String assignedFeeId) {
        AssignedFee af = assignedFeeRepository.findById(assignedFeeId)
                .orElseThrow(() -> new RuntimeException("Assigned fee not found with id: " + assignedFeeId));
        BigDecimal required = calculateAmount(af);
        BigDecimal paid = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO;
        BigDecimal remaining = required.subtract(paid);

        String bankId = "MB"; // MBBank
        String accountNo = "123456789";
        String accountName = "CONG TY CP CYBERSPACE";
        String description = "THANH TOAN PHI ASSIGNED_FEE_ID " + af.getId();

        try {
            description = java.net.URLEncoder.encode(description, "UTF-8");
            accountName = java.net.URLEncoder.encode(accountName, "UTF-8");
        } catch (Exception e) {
            // fallback
        }

        return String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                bankId, accountNo, remaining.toPlainString(), description, accountName);
    }

    // =========================================================
    // 2. XEM NỢ / CHƯA NỘP
    // =========================================================

    @Transactional(readOnly = true)
    public Page<AssignedFeeDTO> getUnpaidFees(String periodId, String householdId, Pageable pageable) {
        Page<AssignedFee> page;
        List<FeeStatus> unpaidStatuses = List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL);

        if (periodId != null && householdId != null) {
            // Đối với xem nợ, xem cả UNPAID và PARTIAL
            page = assignedFeeRepository.findByPeriodIdAndHouseholdIdAndStatusIn(
                    periodId, householdId, unpaidStatuses, pageable);
        } else if (periodId != null) {
            page = assignedFeeRepository.findByPeriodIdAndStatusIn(periodId, unpaidStatuses, pageable);
        } else if (householdId != null) {
            page = assignedFeeRepository.findByHouseholdIdAndStatusIn(householdId, unpaidStatuses)
                    .stream().collect(java.util.stream.Collectors.collectingAndThen(
                            java.util.stream.Collectors.toList(),
                            list -> new org.springframework.data.domain.PageImpl<>(list, pageable, list.size())));
        } else {
            page = assignedFeeRepository.findByStatusIn(unpaidStatuses).stream()
                    .collect(java.util.stream.Collectors.collectingAndThen(
                            java.util.stream.Collectors.toList(),
                            list -> new org.springframework.data.domain.PageImpl<>(list, pageable, list.size())));
        }

        return page.map(this::mapToAssignedFeeDTO);
    }

    // =========================================================
    // 3. DANH SÁCH TẤT CẢ PHÍ THEO ĐỢT (bao gồm PAID + UNPAID)
    // =========================================================

    @Transactional(readOnly = true)
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
                        qty = residentRepository.countActiveMembers(hh.getId());
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
        int activeMembers = (int) residentRepository.countActiveMembers(hh.getId());
        double quantity = af.getFee().getCalcMethod() == CalcMethod.PER_PERSON ? activeMembers : af.getQuantity();
        return AssignedFeeDTO.builder()
                .id(af.getId())
                .householdId(hh.getId())
                .ownerName(hh.getOwnerName())
                .membersCount(activeMembers)
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
                .quantity(quantity)
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
                .payerName(r.getPayerName())
                .receiptStatus(r.getStatus() != null ? r.getStatus().name() : "ACTIVE")
                .createdAt(r.getCreatedAt())
                .build();
    }
}
