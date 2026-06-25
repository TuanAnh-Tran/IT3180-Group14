package com.cnpm.apartment.config;

import com.cnpm.apartment.model.*;
import com.cnpm.apartment.model.enums.*;
import com.cnpm.apartment.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
@Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final FeeRepository feeRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final AssignedFeeRepository assignedFeeRepository;
    private final ReceiptRepository receiptRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedUsers();
        seedFinanceData();
        seedNotifications();
    }

    private void seedUsers() {
        createUserIfMissing(
                "admin",
                "admin123",
                "admin@cyberspace.vn",
                "System Admin",
                null,
                "0987654321",
                "001085000111",
                UserRole.ROLE_ADMIN);

        createUserIfMissing(
                "accountant",
                "accountant123",
                "accountant@cyberspace.vn",
                "Accountant Rep",
                null,
                "0911222333",
                "031079000333",
                UserRole.ROLE_ACCOUNTANT);

        createUserIfMissing(
                "resident1",
                "user123",
                "resident1@cyberspace.vn",
                "Nguyen Van An",
                "HH-A1201",
                "0987654321",
                "001085000222",
                UserRole.ROLE_USER);
    }

    private void createUserIfMissing(
            String username,
            String rawPassword,
            String email,
            String fullname,
            String room,
            String phone,
            String identityNo,
            UserRole role) {
        User existing = userRepository.findByUsername(username).orElse(null);
        if (existing != null) {
            if (!passwordEncoder.matches(rawPassword, existing.getPasswordHash())) {
                existing.setPasswordHash(passwordEncoder.encode(rawPassword));
            }
            existing.setRole(role);
            existing.setStatus(UserStatus.APPROVED);
            existing.setFailedAttempts(0);
            existing.setLockTime(null);
            userRepository.save(existing);
            return;
        }

        userRepository.save(User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .email(email)
                .fullname(fullname)
                .room(room)
                .phone(phone)
                .identityNo(identityNo)
                .role(role)
                .status(UserStatus.APPROVED)
                .failedAttempts(0)
                .build());
    }

    private void seedFinanceData() {
        List<Household> households = householdRepository.findAll();
        if (households.isEmpty()) {
            return;
        }

        Household firstHousehold = findHousehold("HH-A1201", households, 0);
        Household secondHousehold = findHousehold("HH-B0805", households, Math.min(1, households.size() - 1));

        Fee managementFee = fee("FEE001", "Apartment Management Fee", FeeType.MANDATORY, CalcMethod.PER_M2, "15000");
        Fee wasteFee = fee("FEE002", "Waste Cleaning Fee", FeeType.MANDATORY, CalcMethod.PER_PERSON, "72000");
        Fee motorcycleFee = fee("FEE003", "Motorcycle Parking Fee", FeeType.VEHICLE, CalcMethod.PER_MOTORCYCLE, "70000");
        Fee carFee = fee("FEE004", "Car Parking Fee", FeeType.VEHICLE, CalcMethod.PER_CAR, "150000");
        Fee welfareFee = fee("FEE005", "Welfare Fund", FeeType.VOLUNTARY, CalcMethod.PER_PERSON, "20000");
        Fee waterFee = fee("FEE009", "Running Water Fee", FeeType.UTILITY, CalcMethod.CONSUMPTION, "15000");

        CollectionPeriod currentPeriod = period("PER-DEMO-2026-06", "June 2026 Cycle", PeriodStatus.OPEN, LocalDateTime.now());
        CollectionPeriod previousPeriod = period("PER-DEMO-2026-05", "May 2026 Cycle", PeriodStatus.CLOSED, LocalDateTime.now().minusMonths(1));

        if (assignedFeeRepository.count() > 0) {
            return;
        }

        AssignedFee firstManagement = assignedFee("AF-DEMO-001", firstHousehold, currentPeriod, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        AssignedFee firstWaste = assignedFee("AF-DEMO-002", firstHousehold, currentPeriod, wasteFee, 1, FeeStatus.PARTIAL, money("100000"), LocalDateTime.now());
        assignedFee("AF-DEMO-003", firstHousehold, currentPeriod, motorcycleFee, Math.max(1, firstHousehold.getMotorcycleCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-004", firstHousehold, currentPeriod, waterFee, 15, FeeStatus.UNPAID, BigDecimal.ZERO, null);

        AssignedFee secondManagement = assignedFee("AF-DEMO-005", secondHousehold, currentPeriod, managementFee, 1, FeeStatus.PAID, managementAmount(secondHousehold, managementFee), LocalDateTime.now());
        AssignedFee secondWaste = assignedFee("AF-DEMO-006", secondHousehold, currentPeriod, wasteFee, 1, FeeStatus.PAID, personAmount(secondHousehold, wasteFee), LocalDateTime.now());
        assignedFee("AF-DEMO-007", secondHousehold, currentPeriod, carFee, Math.max(1, secondHousehold.getCarCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        AssignedFee secondWater = assignedFee("AF-DEMO-008", secondHousehold, currentPeriod, waterFee, 20, FeeStatus.PAID, money("300000"), LocalDateTime.now());

        AssignedFee previousManagement = assignedFee("AF-DEMO-009", firstHousehold, previousPeriod, managementFee, 1, FeeStatus.PAID, managementAmount(firstHousehold, managementFee), LocalDateTime.now().minusDays(20));
        assignedFee("AF-DEMO-010", firstHousehold, previousPeriod, welfareFee, 1, FeeStatus.PAID, personAmount(firstHousehold, welfareFee), LocalDateTime.now().minusDays(19));

        receipt("RC-DEMO-001", secondManagement, secondManagement.getAmountPaidAccumulated(), "Bank Transfer", "accountant");
        receipt("RC-DEMO-002", secondWaste, secondWaste.getAmountPaidAccumulated(), "Cash", "accountant");
        receipt("RC-DEMO-003", secondWater, secondWater.getAmountPaidAccumulated(), "Resident online payment", "resident1");
        receipt("RC-DEMO-004", previousManagement, previousManagement.getAmountPaidAccumulated(), "Previous cycle payment", "admin");
        receipt("RC-DEMO-005", firstWaste, firstWaste.getAmountPaidAccumulated(), "Partial payment", "accountant");
    }

    private Household findHousehold(String preferredId, List<Household> households, int fallbackIndex) {
        return householdRepository.findById(preferredId)
                .orElse(households.get(Math.max(0, Math.min(fallbackIndex, households.size() - 1))));
    }

    private Fee fee(String id, String name, FeeType type, CalcMethod calcMethod, String price) {
        return feeRepository.findById(id).orElseGet(() -> feeRepository.save(Fee.builder()
                .id(id)
                .name(name)
                .type(type)
                .calcMethod(calcMethod)
                .price(money(price))
                .build()));
    }

    private CollectionPeriod period(String id, String name, PeriodStatus status, LocalDateTime createdAt) {
        return collectionPeriodRepository.findById(id).orElseGet(() -> collectionPeriodRepository.save(CollectionPeriod.builder()
                .id(id)
                .name(name)
                .status(status)
                .createdAt(createdAt)
                .build()));
    }

    private AssignedFee assignedFee(
            String id,
            Household household,
            CollectionPeriod period,
            Fee fee,
            double quantity,
            FeeStatus status,
            BigDecimal amountPaid,
            LocalDateTime paidAt) {
        return assignedFeeRepository.findById(id).orElseGet(() -> assignedFeeRepository.save(AssignedFee.builder()
                .id(id)
                .household(household)
                .period(period)
                .fee(fee)
                .quantity(quantity)
                .status(status)
                .amountPaidAccumulated(amountPaid)
                .paidAt(paidAt)
                .build()));
    }

    private void receipt(String id, AssignedFee assignedFee, BigDecimal amount, String note, String createdBy) {
        if (receiptRepository.existsById(id)) {
            return;
        }

        receiptRepository.save(Receipt.builder()
                .id(id)
                .assignedFee(assignedFee)
                .amountPaid(amount)
                .paidAt(assignedFee.getPaidAt() != null ? assignedFee.getPaidAt() : LocalDateTime.now())
                .note(note)
                .createdBy(createdBy)
                .payerName(assignedFee.getHousehold().getOwnerName())
                .status(ReceiptStatus.ACTIVE)
                .idempotencyKey(id)
                .build());
    }

    private void seedNotifications() {
        notification("NOTIF-DEMO-ADMIN-001", "admin", "System is ready", "Docker services, backend API, and database seed data are ready for demo.");
        notification("NOTIF-DEMO-ACCOUNTANT-001", "accountant", "Payment review", "Sample unpaid and partial fees are available in the payment module.");
        notification("NOTIF-DEMO-RESIDENT-001", "resident1", "New bill available", "Your June 2026 sample bill is ready for review.");
    }

    private void notification(String id, String targetUsername, String title, String content) {
        if (notificationRepository.existsById(id) || userRepository.findByUsername(targetUsername).isEmpty()) {
            return;
        }

        notificationRepository.save(Notification.builder()
                .id(id)
                .targetUsername(targetUsername)
                .title(title)
                .content(content)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private BigDecimal managementAmount(Household household, Fee fee) {
        return fee.getPrice().multiply(BigDecimal.valueOf(household.getArea()));
    }

    private BigDecimal personAmount(Household household, Fee fee) {
        return fee.getPrice().multiply(BigDecimal.valueOf(Math.max(1, household.getMembersCount())));
    }

    private BigDecimal money(String value) {
        return new BigDecimal(value);
    }
}
