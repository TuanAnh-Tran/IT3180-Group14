package com.cnpm.apartment.service;

import com.cnpm.apartment.dto.AssignedFeeDTO;
import com.cnpm.apartment.dto.PaymentRequestDTO;
import com.cnpm.apartment.dto.ReceiptDTO;
import com.cnpm.apartment.dto.PeriodDTO;
import com.cnpm.apartment.dto.PeriodSaveDTO;
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
import com.cnpm.apartment.repository.UserRepository;
import com.cnpm.apartment.model.User;
import com.cnpm.apartment.model.Notification;
import com.cnpm.apartment.repository.NotificationRepository;
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
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
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

        // Query đợt thu từ database để đảm bảo không bị stale/cache trạng thái từ JPA proxy
        if (af.getPeriod() != null) {
            CollectionPeriod period = collectionPeriodRepository.findById(af.getPeriod().getId())
                    .orElseThrow(() -> new RuntimeException("Collection period not found"));
            if (period.getStatus() == PeriodStatus.CLOSED) {
                throw new RuntimeException("This collection period is closed. Payment is not allowed.");
            }
        }
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
            BigDecimal currentAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated()
                    : BigDecimal.ZERO;
            userPayment = amountRequired.subtract(currentAccumulated);
            if (userPayment.compareTo(BigDecimal.ZERO) <= 0) {
                userPayment = BigDecimal.ZERO;
            }
        }

        // Lấy tên người dùng hiện tại (từ JWT Security context)
        String currentUser = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        // Kiểm tra quyền hạn của cư dân (ROLE_user) để đảm bảo họ chỉ được đóng phí cho
        // hộ của mình
        org.springframework.security.core.Authentication authentication = SecurityContextHolder.getContext()
                .getAuthentication();
        boolean isResident = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_user"));
        if (isResident) {
            User userObj = userRepository.findByUsername(currentUser)
                    .orElseThrow(() -> new RuntimeException("Logged in user not found"));
            if (userObj.getRoom() == null || !userObj.getRoom().equals(af.getHousehold().getId())) {
                throw new RuntimeException("You are not authorized to make payment for this household.");
            }
        }

        // Cập nhật số tiền lũy kế đã nộp
        BigDecimal currentAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated()
                : BigDecimal.ZERO;
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

    @Transactional(readOnly = true)
    public Page<AssignedFeeDTO> getUnpaidFees(String periodId, String householdId, Pageable pageable) {
        // Kiểm tra quyền hạn của cư dân (ROLE_user) để giới hạn householdId
        org.springframework.security.core.Authentication authentication = SecurityContextHolder.getContext()
                .getAuthentication();
        boolean isResident = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_user"));
        if (isResident) {
            String currentUser = authentication.getName();
            User userObj = userRepository.findByUsername(currentUser)
                    .orElseThrow(() -> new RuntimeException("Logged in user not found"));
            householdId = userObj.getRoom();
        }

        Page<AssignedFee> page;
        boolean hasPeriod = periodId != null && !periodId.trim().isEmpty();
        boolean hasHousehold = householdId != null && !householdId.trim().isEmpty();
        java.util.List<FeeStatus> unpaidStatuses = java.util.List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL);

        if (hasPeriod && hasHousehold) {
            // Đối với xem nợ, xem cả UNPAID và PARTIAL
            page = assignedFeeRepository.findByPeriodIdAndHouseholdIdAndStatusIn(
                    periodId, householdId, unpaidStatuses, pageable);
        } else if (hasPeriod) {
            page = assignedFeeRepository.findByPeriodIdAndStatusIn(periodId, unpaidStatuses, pageable);
        } else if (hasHousehold) {
            page = assignedFeeRepository.findByHouseholdIdAndStatusIn(householdId, unpaidStatuses, pageable);
        } else {
            page = assignedFeeRepository.findByStatusIn(unpaidStatuses, pageable);
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
     * Tạo một đợt thu phí mới và quét nợ cũ (UNPAID hoặc PARTIAL) để cộng dồn vào
     * đợt này.
     */
    @Transactional
    public CollectionPeriod createPeriod(String id, String name, LocalDateTime dueDate, List<String> feeIds) {
        // Tìm đợt thu gần nhất trước đó (nếu có) trước khi lưu đợt mới
        java.util.Optional<CollectionPeriod> latestPeriodOpt = collectionPeriodRepository.findFirstByOrderByCreatedAtDesc();

        CollectionPeriod period = CollectionPeriod.builder()
                .id(id)
                .name(name)
                .status(PeriodStatus.OPEN)
                .dueDate(dueDate)
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
                            .type(FeeType.COMPULSORY)
                            .calcMethod(CalcMethod.FIXED)
                            .price(BigDecimal.ONE)
                            .build();
                    return feeRepository.save(f);
                });

        for (Household hh : households) {
            // Quét các khoản còn nợ của đợt cũ (chỉ từ đợt gần nhất để tránh cộng dồn lặp)
            BigDecimal totalDebt = BigDecimal.ZERO;
            if (latestPeriodOpt.isPresent()) {
                List<AssignedFee> unpaidFees = assignedFeeRepository.findByPeriodIdAndHouseholdIdAndStatusIn(
                        latestPeriodOpt.get().getId(), hh.getId(), List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL));

                for (AssignedFee af : unpaidFees) {
                    BigDecimal required = calculateAmount(af);
                    BigDecimal paidAccumulated = af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated()
                            : BigDecimal.ZERO;
                    BigDecimal debt = required.subtract(paidAccumulated);
                    if (debt.compareTo(BigDecimal.ZERO) > 0) {
                        totalDebt = totalDebt.add(debt);
                    }
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
                if (fee.getId().equals("FEE_DEBT"))
                    continue;

                boolean shouldAssign = false;
                double qty = 1.0;

                if (fee.getType() == FeeType.COMPULSORY) {
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

        // Gửi thông báo đến toàn bộ cư dân về đợt thu mới
        try {
            List<User> residents = userRepository.findByRole("user");
            for (User resident : residents) {
                Notification notif = Notification.builder()
                        .id(UUID.randomUUID().toString())
                        .username(resident.getUsername())
                        .title("New collection period: " + period.getName())
                        .content("Đợt thu phí mới '" + period.getName() + "' đã được tạo. Vui lòng thanh toán các khoản phí trước ngày hạn đóng.")
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(notif);
            }
            log.info("Đã tạo thông báo đợt thu mới cho {} cư dân", residents.size());
        } catch (Exception e) {
            log.error("Lỗi khi tạo thông báo cho đợt thu mới: {}", e.getMessage(), e);
        }

        return period;
    }

    // =========================================================
    // 5. QUẢN LÝ ĐỢT THU PHÍ (CollectionPeriod) REST APIs
    // =========================================================

    /**
     * Lấy toàn bộ danh sách đợt thu phí.
     */
    @Transactional(readOnly = true)
    public List<PeriodDTO> getAllPeriods() {
        return collectionPeriodRepository
                .findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
                        "createdAt"))
                .stream()
                .map(this::mapToPeriodDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Lấy chi tiết đợt thu phí theo ID.
     */
    @Transactional(readOnly = true)
    public PeriodDTO getPeriodById(String id) {
        CollectionPeriod period = collectionPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đợt thu phí với ID: " + id));
        return mapToPeriodDTO(period);
    }

    /**
     * Đóng đợt thu phí.
     */
    @Transactional
    public PeriodDTO closePeriod(String id) {
        CollectionPeriod period = collectionPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đợt thu phí với ID: " + id));
        period.setStatus(PeriodStatus.CLOSED);
        CollectionPeriod saved = collectionPeriodRepository.save(period);
        log.info("Đã đóng đợt thu phí thành công: {}", id);

        // Gửi thông báo cho toàn bộ cư dân
        try {
            List<User> residents = userRepository.findByRole("user");
            int overdueNotified = 0;
            int closedNotified = 0;

            for (User resident : residents) {
                String room = resident.getRoom();
                if (room == null || room.trim().isEmpty()) {
                    continue;
                }

                // Kiểm tra xem phòng của cư dân này có khoản phí chưa đóng trong đợt này không
                List<AssignedFee> unpaidFees = assignedFeeRepository.findByPeriodIdAndHouseholdIdAndStatusIn(
                        id, room, List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL));

                Notification notif;
                if (!unpaidFees.isEmpty()) {
                    // Phòng còn nợ phí -> Gửi cảnh báo quá hạn
                    notif = Notification.builder()
                            .id(UUID.randomUUID().toString())
                            .username(resident.getUsername())
                            .title("Overdue Payment Alert: " + period.getName())
                            .content("Đợt thu '" + period.getName() + "' đã bị đóng. Phòng của bạn vẫn còn khoản phí chưa hoàn thành thanh toán. Vui lòng thanh toán sớm.")
                            .read(false)
                            .createdAt(LocalDateTime.now())
                            .build();
                    overdueNotified++;
                } else {
                    // Phòng đã đóng đủ phí -> Gửi thông báo cảm ơn
                    notif = Notification.builder()
                            .id(UUID.randomUUID().toString())
                            .username(resident.getUsername())
                            .title("Collection Period Closed: " + period.getName())
                            .content("Đợt thu phí '" + period.getName() + "' đã được đóng. Cảm ơn bạn đã hoàn thành đóng phí đầy đủ và đúng hạn.")
                            .read(false)
                            .createdAt(LocalDateTime.now())
                            .build();
                    closedNotified++;
                }
                notificationRepository.save(notif);
            }
            log.info("Đã gửi thông báo đóng đợt thu: {} cảnh báo quá hạn, {} cảm ơn hoàn thành", overdueNotified, closedNotified);
        } catch (Exception e) {
            log.error("Lỗi gửi thông báo khi đóng đợt thu: {}", e.getMessage(), e);
        }

        return mapToPeriodDTO(saved);
    }

    /**
     * Mở lại đợt thu phí đã đóng.
     */
    @Transactional
    public PeriodDTO reopenPeriod(String id) {
        CollectionPeriod period = collectionPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đợt thu phí với ID: " + id));
        if (period.getStatus() == PeriodStatus.OPEN) {
            throw new RuntimeException("Đợt thu phí này hiện đang mở.");
        }
        period.setStatus(PeriodStatus.OPEN);
        CollectionPeriod saved = collectionPeriodRepository.save(period);
        log.info("Đã mở lại đợt thu phí thành công: {}", id);

        // Gửi thông báo mở lại cho toàn bộ cư dân
        try {
            List<User> residents = userRepository.findByRole("user");
            int overdueNotified = 0;
            int closedNotified = 0;

            for (User resident : residents) {
                String room = resident.getRoom();
                if (room == null || room.trim().isEmpty()) {
                    continue;
                }

                List<AssignedFee> unpaidFees = assignedFeeRepository.findByPeriodIdAndHouseholdIdAndStatusIn(
                        id, room, List.of(FeeStatus.UNPAID, FeeStatus.PARTIAL));

                Notification notif;
                if (!unpaidFees.isEmpty()) {
                    notif = Notification.builder()
                            .id(UUID.randomUUID().toString())
                            .username(resident.getUsername())
                            .title("Collection Period Reopened: " + period.getName())
                            .content("Đợt thu '" + period.getName() + "' đã được mở lại. Vui lòng hoàn thành các khoản phí còn thiếu.")
                            .read(false)
                            .createdAt(LocalDateTime.now())
                            .build();
                    overdueNotified++;
                } else {
                    notif = Notification.builder()
                            .id(UUID.randomUUID().toString())
                            .username(resident.getUsername())
                            .title("Collection Period Reopened: " + period.getName())
                            .content("Đợt thu phí '" + period.getName() + "' đã được mở lại. Phòng của bạn đã hoàn thành đóng phí đợt này. Cảm ơn bạn.")
                            .read(false)
                            .createdAt(LocalDateTime.now())
                            .build();
                    closedNotified++;
                }
                notificationRepository.save(notif);
            }
            log.info("Đã gửi thông báo mở lại đợt thu: {} nhắc nợ, {} cảm ơn hoàn thành", overdueNotified, closedNotified);
        } catch (Exception e) {
            log.error("Lỗi gửi thông báo khi mở lại đợt thu: {}", e.getMessage(), e);
        }

        return mapToPeriodDTO(saved);
    }

    /**
     * Helper: Chuyển đổi CollectionPeriod sang PeriodDTO
     */
    public PeriodDTO mapToPeriodDTO(CollectionPeriod p) {
        List<String> feeIds = assignedFeeRepository.findFeeIdsByPeriodId(p.getId());
        return PeriodDTO.builder()
                .id(p.getId())
                .name(p.getName())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .feeIds(feeIds)
                .build();
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
                .amountPaidAccumulated(
                        af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO)
                .status(af.getStatus())
                .paidAt(af.getPaidAt())
                .dueDate(af.getPeriod() != null ? af.getPeriod().getDueDate() : null)
                .periodStatus(af.getPeriod() != null ? af.getPeriod().getStatus().name() : null)
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
                .amountPaidAccumulated(
                        af.getAmountPaidAccumulated() != null ? af.getAmountPaidAccumulated() : BigDecimal.ZERO)
                .paidAt(r.getPaidAt())
                .status(af.getStatus())
                .note(r.getNote())
                .createdBy(r.getCreatedBy())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
