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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final ResidentRepository residentRepository;
    private final FeeRepository feeRepository;
    private final CollectionPeriodRepository collectionPeriodRepository;
    private final AssignedFeeRepository assignedFeeRepository;
    private final ReceiptRepository receiptRepository;
    private final NotificationRepository notificationRepository;
    private final VehicleRepository vehicleRepository;
    private final UtilityRecordRepository utilityRecordRepository;
    private final PaymentProofRepository paymentProofRepository;
    private final TemporaryResidenceRecordRepository temporaryResidenceRecordRepository;
    private final ResidentActivityLogRepository residentActivityLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedHouseholdsAndResidents();
        seedUsers();
        seedVehicles();
        cleanupLegacyDemoFinanceData();
        seedFinanceData();
        seedResidenceRecords();
        seedPaymentProofs();
        seedActivityLogs();
        seedNotifications();
    }

    private void seedHouseholdsAndResidents() {
        Household hA = household("HH-A1201", "A1201", 12, 72.5, "Nguyen Van An", "0987654321",
                "12", "Tran Duy Hung", "Trung Hoa", "Cau Giay", LocalDate.of(2024, 1, 10),
                2, 0, HouseholdStatus.OCCUPIED, "Main demo household. Use RES-HA002 or RES-NAM003 for split tests.");
        Household hB = household("HH-B0805", "B0805", 8, 65.0, "Tran Thi Binh", "0911222333",
                "8", "Pham Hung", "My Dinh 1", "Nam Tu Liem", LocalDate.of(2024, 3, 15),
                1, 1, HouseholdStatus.OCCUPIED, "Contains a temporary resident and both car/motorcycle fees.");
        Household hC = household("HH-C0901", "C0901", 9, 88.0, "Pham Quang Minh", "0903333444",
                "9", "Le Van Luong", "Nhan Chinh", "Thanh Xuan", LocalDate.of(2025, 2, 5),
                2, 1, HouseholdStatus.OCCUPIED, "Good data for ownership transfer, QR and partial payment tests.");
        Household hD = household("HH-D0302", "D0302", 3, 54.0, "Hoang Van Duc", "0935555666",
                "3", "Nguyen Trai", "Thuong Dinh", "Thanh Xuan", LocalDate.of(2023, 11, 18),
                1, 0, HouseholdStatus.OCCUPIED, "Use this household to test head death and replacement head.");
        Household hE = household("HH-E1507", "E1507", 15, 45.0, "Vo Thi Hoa", "0967777888",
                "15", "Ho Tung Mau", "Mai Dich", "Cau Giay", LocalDate.of(2025, 8, 22),
                0, 0, HouseholdStatus.OCCUPIED, "Single-member household for negative split/delete tests.");
        Household hF = household("HH-F0001", "F0001", 0, 50.0, "Vacant Unit", null,
                "", "Demo Tower", "Dich Vong", "Cau Giay", LocalDate.of(2026, 1, 1),
                0, 0, HouseholdStatus.VACANT, "Vacant unit for add-member/archive-household tests.");
        Household hG = household("HH-G2108", "G2108", 21, 105.0, "Doan Gia Khanh", "0979999000",
                "21", "Xuan Thuy", "Dich Vong Hau", "Cau Giay", LocalDate.of(2024, 9, 9),
                2, 1, HouseholdStatus.OCCUPIED, "Large household with debt and deceased-history data.");

        Resident an = resident("RES-AN001", hA, "Nguyen Van An", "Male", LocalDate.of(1985, 4, 12),
                "001085000111", "0987654321", "Head", ResidentStatus.PERMANENT, true, null,
                "Engineer", "Tech Company", "Cau Giay, Hanoi");
        Resident ha = resident("RES-HA002", hA, "Le Thu Ha", "Female", LocalDate.of(1988, 8, 20),
                "001188000222", "0977000111", "Spouse", ResidentStatus.PERMANENT, true, null,
                "Teacher", "Secondary School", "Cau Giay, Hanoi");
        resident("RES-NAM003", hA, "Nguyen Hoai Nam", "Male", LocalDate.of(2012, 6, 3),
                "001112000333", "0987000333", "Child", ResidentStatus.PERMANENT, true, null,
                "Student", "BlueMoon Secondary School", "Cau Giay, Hanoi");

        Resident binh = resident("RES-BINH003", hB, "Tran Thi Binh", "Female", LocalDate.of(1979, 1, 15),
                "031079000333", "0911222333", "Head", ResidentStatus.PERMANENT, true, null,
                "Accountant", "Finance Office", "Nam Dinh");
        resident("RES-DUC004", hB, "Pham Minh Duc", "Male", LocalDate.of(1998, 11, 2),
                "022098000444", "0909090909", "Tenant", ResidentStatus.TEMPORARY, true, null,
                "Student", "University", "Hai Phong");
        resident("RES-LINH006", hB, "Tran Bao Linh", "Female", LocalDate.of(2004, 3, 27),
                "022104000555", "0901234567", "Child", ResidentStatus.TEMPORARILY_AWAY, true, null,
                "Intern", "Da Nang Software Park", "Da Nang");

        Resident minh = resident("RES-MINH007", hC, "Pham Quang Minh", "Male", LocalDate.of(1990, 7, 7),
                "001090000555", "0903333444", "Head", ResidentStatus.PERMANENT, true, null,
                "Product Manager", "Cyberspace Labs", "Hanoi");
        resident("RES-LAN008", hC, "Do Thi Lan", "Female", LocalDate.of(1992, 12, 9),
                "001092000666", "0903333555", "Spouse", ResidentStatus.PERMANENT, true, null,
                "Designer", "BlueMoon Studio", "Hanoi");
        resident("RES-ANH009", hC, "Pham Minh Anh", "Female", LocalDate.of(2018, 5, 16),
                "001118000777", "0903333666", "Child", ResidentStatus.PERMANENT, true, null,
                "Student", "BlueMoon Primary School", "Hanoi");

        Resident duc = resident("RES-DUC010", hD, "Hoang Van Duc", "Male", LocalDate.of(1975, 2, 11),
                "001075000888", "0935555666", "Head", ResidentStatus.PERMANENT, true, null,
                "Retired Officer", "Retired", "Hanoi");
        resident("RES-MAI011", hD, "Nguyen Thi Mai", "Female", LocalDate.of(1978, 10, 28),
                "001078000999", "0935555777", "Spouse", ResidentStatus.PERMANENT, true, null,
                "Nurse", "District Clinic", "Hanoi");

        Resident hoa = resident("RES-HOA012", hE, "Vo Thi Hoa", "Female", LocalDate.of(1982, 4, 1),
                "079082001111", "0967777888", "Head", ResidentStatus.PERMANENT, true, null,
                "Consultant", "Independent", "Ho Chi Minh City");

        Resident khanh = resident("RES-KHANH013", hG, "Doan Gia Khanh", "Male", LocalDate.of(1983, 9, 13),
                "001083001212", "0979999000", "Head", ResidentStatus.PERMANENT, true, null,
                "Business Owner", "Khanh Trading", "Hanoi");
        resident("RES-THAO014", hG, "Bui Minh Thao", "Female", LocalDate.of(1986, 1, 23),
                "001086001313", "0979999111", "Spouse", ResidentStatus.PERMANENT, true, null,
                "Auditor", "North Audit", "Hanoi");
        resident("RES-BIN015", hG, "Doan Gia Bin", "Male", LocalDate.of(2015, 8, 30),
                "001115001414", "0979999222", "Child", ResidentStatus.PERMANENT, true, null,
                "Student", "BlueMoon Primary School", "Hanoi");
        resident("RES-OLD016", hG, "Doan Van Phuc", "Male", LocalDate.of(1944, 2, 2),
                "001044001515", "0979999333", "Parent", ResidentStatus.DECEASED, false, LocalDate.of(2025, 12, 12),
                "Retired", "Retired", "Hanoi");
        resident("RES-MOVED017", null, "Dang Thi Tam", "Female", LocalDate.of(1996, 9, 9),
                "001096001616", "0902222333", "", ResidentStatus.MOVED_OUT, true, null,
                "Office Staff", "Old Tenant", "Hai Duong");

        setHead(hA, an);
        setHead(hB, binh);
        setHead(hC, minh);
        setHead(hD, duc);
        setHead(hE, hoa);
        setHead(hG, khanh);
        syncMemberCounts(List.of(hA, hB, hC, hD, hE, hF, hG));
    }

    private void seedUsers() {
        upsertUser("admin", "admin123", "admin@cyberspace.vn", "System Admin", null,
                "0987654321", "001080000001", UserRole.ROLE_ADMIN, UserStatus.APPROVED, 0, null);
        upsertUser("accountant", "accountant123", "accountant@cyberspace.vn", "Accountant Rep", null,
                "0911222333", "001081000002", UserRole.ROLE_ACCOUNTANT, UserStatus.APPROVED, 0, null);
        upsertUser("resident1", "user123", "resident1@cyberspace.vn", "Nguyen Van An", "HH-A1201",
                "0987654321", "001085000111", UserRole.ROLE_USER, UserStatus.APPROVED, 0, null);
        upsertUser("resident2", "user123", "resident2@cyberspace.vn", "Pham Quang Minh", "HH-C0901",
                "0903333444", "001090000555", UserRole.ROLE_USER, UserStatus.APPROVED, 0, null);
        upsertUser("pending_resident", "pending123", "pending@cyberspace.vn", "Pending Demo Resident", "HH-F0001",
                "0900000999", "001099009999", UserRole.ROLE_USER, UserStatus.PENDING, 0, null);
        upsertUser("locked_resident", "locked123", "locked@cyberspace.vn", "Locked Demo Resident", "HH-E1507",
                "0900000888", "001088008888", UserRole.ROLE_USER, UserStatus.LOCKED, 0, null);
    }

    private void seedVehicles() {
        vehicle("VH-A-001", "29A1-120.01", "MOTORCYCLE", "Nguyen Van An", LocalDate.of(2024, 1, 11), "HH-A1201");
        vehicle("VH-A-002", "29B1-120.02", "MOTORCYCLE", "Le Thu Ha", LocalDate.of(2024, 1, 12), "HH-A1201");
        vehicle("VH-B-001", "30F-080.50", "CAR", "Tran Thi Binh", LocalDate.of(2024, 3, 20), "HH-B0805");
        vehicle("VH-B-002", "29C1-080.51", "MOTORCYCLE", "Pham Minh Duc", LocalDate.of(2024, 4, 1), "HH-B0805");
        vehicle("VH-C-001", "30G-090.10", "CAR", "Pham Quang Minh", LocalDate.of(2025, 2, 10), "HH-C0901");
        vehicle("VH-C-002", "29D1-090.11", "MOTORCYCLE", "Do Thi Lan", LocalDate.of(2025, 2, 12), "HH-C0901");
        vehicle("VH-G-001", "30H-210.80", "CAR", "Doan Gia Khanh", LocalDate.of(2024, 9, 15), "HH-G2108");
        vehicle("VH-G-002", "29E1-210.81", "MOTORCYCLE", "Bui Minh Thao", LocalDate.of(2024, 9, 16), "HH-G2108");
    }

    private void cleanupLegacyDemoFinanceData() {
        paymentProofRepository.findAll().stream()
                .filter(proof -> proof.getAssignedFee() != null
                        && isLegacyDemoAssignedFeeId(proof.getAssignedFee().getId()))
                .forEach(paymentProofRepository::delete);

        receiptRepository.findAll().stream()
                .filter(receipt -> receipt.getId().matches("RC-DEMO-\\d+")
                        || (receipt.getAssignedFee() != null
                        && isLegacyDemoAssignedFeeId(receipt.getAssignedFee().getId())))
                .forEach(receiptRepository::delete);

        assignedFeeRepository.findAll().stream()
                .filter(assignedFee -> isLegacyDemoAssignedFeeId(assignedFee.getId()))
                .forEach(assignedFeeRepository::delete);
    }

    private boolean isLegacyDemoAssignedFeeId(String id) {
        return id != null && id.matches("AF-DEMO-\\d+");
    }

    private void seedFinanceData() {
        Household hA = requireHousehold("HH-A1201");
        Household hB = requireHousehold("HH-B0805");
        Household hC = requireHousehold("HH-C0901");
        Household hD = requireHousehold("HH-D0302");
        Household hE = requireHousehold("HH-E1507");
        Household hG = requireHousehold("HH-G2108");

        Fee managementFee = fee("FEE001", "Apartment Management Fee", FeeType.MANDATORY, CalcMethod.PER_M2, "15000");
        Fee wasteFee = fee("FEE002", "Waste Cleaning Fee", FeeType.MANDATORY, CalcMethod.PER_PERSON, "72000");
        Fee motorcycleFee = fee("FEE003", "Motorcycle Parking Fee", FeeType.VEHICLE, CalcMethod.PER_MOTORCYCLE, "70000");
        Fee carFee = fee("FEE004", "Car Parking Fee", FeeType.VEHICLE, CalcMethod.PER_CAR, "1500000");
        Fee welfareFee = fee("FEE005", "Welfare Fund", FeeType.VOLUNTARY, CalcMethod.PER_PERSON, "20000");
        Fee securityFee = fee("FEE006", "Security Service Fee", FeeType.MANDATORY, CalcMethod.FIXED, "120000");
        Fee elevatorFee = fee("FEE007", "Elevator Maintenance Fee", FeeType.MANDATORY, CalcMethod.PER_M2, "8000");
        Fee eventFee = fee("FEE008", "Resident Event Contribution", FeeType.VOLUNTARY, CalcMethod.FIXED, "50000");
        Fee waterFee = fee("FEE009", "Running Water Fee", FeeType.UTILITY, CalcMethod.CONSUMPTION, "15000");

        CollectionPeriod april = period("PER-DEMO-2026-04", "April 2026 Cycle", PeriodStatus.CLOSED, LocalDateTime.now().minusMonths(2));
        CollectionPeriod may = period("PER-DEMO-2026-05", "May 2026 Cycle", PeriodStatus.CLOSED, LocalDateTime.now().minusMonths(1));
        CollectionPeriod june = period("PER-DEMO-2026-06", "June 2026 Cycle", PeriodStatus.OPEN, LocalDateTime.now().minusDays(5));
        CollectionPeriod july = period("PER-DEMO-2026-07", "July 2026 Draft Cycle", PeriodStatus.OPEN, LocalDateTime.now().plusDays(5));

        AssignedFee aMgmt = assignedFee("AF-DEMO-A-MGMT-202606", hA, june, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        AssignedFee aWaste = assignedFee("AF-DEMO-A-WASTE-202606", hA, june, wasteFee, 1, FeeStatus.PARTIAL, money("100000"), LocalDateTime.now().minusDays(2));
        assignedFee("AF-DEMO-A-MOTO-202606", hA, june, motorcycleFee, Math.max(1, hA.getMotorcycleCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-A-WATER-202606", hA, june, waterFee, 18, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        AssignedFee aWelfare = assignedFee("AF-DEMO-A-WELFARE-202606", hA, june, welfareFee, 1, FeeStatus.PAID,
                requiredAmount(hA, welfareFee, 1), LocalDateTime.now().minusDays(1));

        AssignedFee bMgmt = assignedFee("AF-DEMO-B-MGMT-202606", hB, june, managementFee, 1, FeeStatus.PAID,
                requiredAmount(hB, managementFee, 1), LocalDateTime.now().minusDays(4));
        AssignedFee bWaste = assignedFee("AF-DEMO-B-WASTE-202606", hB, june, wasteFee, 1, FeeStatus.PAID,
                requiredAmount(hB, wasteFee, 1), LocalDateTime.now().minusDays(4));
        assignedFee("AF-DEMO-B-CAR-202606", hB, june, carFee, Math.max(1, hB.getCarCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        AssignedFee bWater = assignedFee("AF-DEMO-B-WATER-202606", hB, june, waterFee, 20, FeeStatus.PAID,
                requiredAmount(hB, waterFee, 20), LocalDateTime.now().minusDays(3));

        AssignedFee cMgmt = assignedFee("AF-DEMO-C-MGMT-202606", hC, june, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-C-WASTE-202606", hC, june, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        AssignedFee cMoto = assignedFee("AF-DEMO-C-MOTO-202606", hC, june, motorcycleFee, Math.max(1, hC.getMotorcycleCount()), FeeStatus.PAID,
                requiredAmount(hC, motorcycleFee, Math.max(1, hC.getMotorcycleCount())), LocalDateTime.now().minusDays(2));
        AssignedFee cCar = assignedFee("AF-DEMO-C-CAR-202606", hC, june, carFee, Math.max(1, hC.getCarCount()), FeeStatus.PAID,
                requiredAmount(hC, carFee, Math.max(1, hC.getCarCount())), LocalDateTime.now().minusDays(2));
        AssignedFee cWater = assignedFee("AF-DEMO-C-WATER-202606", hC, june, waterFee, 24, FeeStatus.PARTIAL, money("150000"), LocalDateTime.now().minusDays(1));

        AssignedFee dMgmt = assignedFee("AF-DEMO-D-MGMT-202606", hD, june, managementFee, 1, FeeStatus.PAID,
                requiredAmount(hD, managementFee, 1), LocalDateTime.now().minusDays(6));
        assignedFee("AF-DEMO-D-WASTE-202606", hD, june, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-D-WATER-202606", hD, june, waterFee, 10, FeeStatus.UNPAID, BigDecimal.ZERO, null);

        assignedFee("AF-DEMO-E-MGMT-202606", hE, june, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-E-WASTE-202606", hE, june, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-E-SECURITY-202606", hE, june, securityFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);

        AssignedFee gMgmt = assignedFee("AF-DEMO-G-MGMT-202606", hG, june, managementFee, 1, FeeStatus.PARTIAL, money("600000"), LocalDateTime.now().minusDays(1));
        assignedFee("AF-DEMO-G-WASTE-202606", hG, june, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-G-WATER-202606", hG, june, waterFee, 25, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-G-ELEVATOR-202606", hG, june, elevatorFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);

        assignedFee("AF-DEMO-A-MGMT-202607", hA, july, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-A-WASTE-202607", hA, july, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-A-MOTO-202607", hA, july, motorcycleFee, Math.max(1, hA.getMotorcycleCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-A-WATER-202607", hA, july, waterFee, 0, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-B-MGMT-202607", hB, july, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-B-WASTE-202607", hB, july, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-B-CAR-202607", hB, july, carFee, Math.max(1, hB.getCarCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-C-MGMT-202607", hC, july, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-C-WASTE-202607", hC, july, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-C-MOTO-202607", hC, july, motorcycleFee, Math.max(1, hC.getMotorcycleCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-C-CAR-202607", hC, july, carFee, Math.max(1, hC.getCarCount()), FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-D-MGMT-202607", hD, july, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-D-WASTE-202607", hD, july, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-D-WATER-202607", hD, july, waterFee, 0, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-E-MGMT-202607", hE, july, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-E-WASTE-202607", hE, july, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-E-SECURITY-202607", hE, july, securityFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-G-MGMT-202607", hG, july, managementFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-G-WASTE-202607", hG, july, wasteFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-G-WATER-202607", hG, july, waterFee, 0, FeeStatus.UNPAID, BigDecimal.ZERO, null);
        assignedFee("AF-DEMO-G-ELEVATOR-202607", hG, july, elevatorFee, 1, FeeStatus.UNPAID, BigDecimal.ZERO, null);

        AssignedFee aPrevMgmt = assignedFee("AF-DEMO-A-MGMT-202605", hA, may, managementFee, 1, FeeStatus.PAID,
                requiredAmount(hA, managementFee, 1), LocalDateTime.now().minusDays(30));
        AssignedFee cPrevWater = assignedFee("AF-DEMO-C-WATER-202605", hC, may, waterFee, 22, FeeStatus.PAID,
                requiredAmount(hC, waterFee, 22), LocalDateTime.now().minusDays(28));
        AssignedFee gPrevEvent = assignedFee("AF-DEMO-G-EVENT-202605", hG, may, eventFee, 1, FeeStatus.PAID,
                requiredAmount(hG, eventFee, 1), LocalDateTime.now().minusDays(27));
        AssignedFee bPrevMgmt = assignedFee("AF-DEMO-B-MGMT-202604", hB, april, managementFee, 1, FeeStatus.PAID,
                requiredAmount(hB, managementFee, 1), LocalDateTime.now().minusDays(58));

        receipt("RC-DEMO-A-WASTE-PARTIAL", aWaste, aWaste.getAmountPaidAccumulated(), "Partial cash payment", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-A-WELFARE", aWelfare, aWelfare.getAmountPaidAccumulated(), "Voluntary contribution", "resident1", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-B-MGMT", bMgmt, bMgmt.getAmountPaidAccumulated(), "Bank transfer", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-B-WASTE", bWaste, bWaste.getAmountPaidAccumulated(), "Cash payment", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-B-WATER", bWater, bWater.getAmountPaidAccumulated(), "Resident online payment", "resident1", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-C-MOTO", cMoto, cMoto.getAmountPaidAccumulated(), "Parking paid", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-C-CAR", cCar, cCar.getAmountPaidAccumulated(), "Parking paid", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-C-WATER-PARTIAL", cWater, cWater.getAmountPaidAccumulated(), "Partial transfer", "resident2", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-D-MGMT-CANCEL-ME", dMgmt, dMgmt.getAmountPaidAccumulated(), "Use this active receipt to test cancel payment", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-G-MGMT-PARTIAL", gMgmt, gMgmt.getAmountPaidAccumulated(), "Partial transfer", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-A-MGMT-202605", aPrevMgmt, aPrevMgmt.getAmountPaidAccumulated(), "Previous month payment", "admin", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-C-WATER-202605", cPrevWater, cPrevWater.getAmountPaidAccumulated(), "Previous month utility", "accountant", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-G-EVENT-202605", gPrevEvent, gPrevEvent.getAmountPaidAccumulated(), "Community event", "resident2", ReceiptStatus.ACTIVE);
        receipt("RC-DEMO-B-MGMT-202604", bPrevMgmt, bPrevMgmt.getAmountPaidAccumulated(), "April management fee", "accountant", ReceiptStatus.ACTIVE);

        utilityRecord("UR-DEMO-A-202606-WATER", hA, june, 120, 138);
        utilityRecord("UR-DEMO-B-202606-WATER", hB, june, 210, 230);
        utilityRecord("UR-DEMO-C-202606-WATER", hC, june, 80, 104);
        utilityRecord("UR-DEMO-D-202606-WATER", hD, june, 340, 350);
        utilityRecord("UR-DEMO-E-202606-WATER", hE, june, 0, 8);
        utilityRecord("UR-DEMO-G-202606-WATER", hG, june, 410, 435);
    }

    private void seedResidenceRecords() {
        temporaryRecord("TRR-DEMO-DUC-TEMP", "RES-DUC004", ResidenceRecordType.TEMPORARY_RESIDENCE,
                "Room B0805, BlueMoon Apartment", LocalDate.of(2026, 6, 1), LocalDate.of(2026, 12, 31),
                "Temporary resident for internship", "admin", LocalDateTime.now().minusDays(7));
        temporaryRecord("TRR-DEMO-LINH-AWAY", "RES-LINH006", ResidenceRecordType.TEMPORARY_ABSENCE,
                "Da Nang Software Park", LocalDate.of(2026, 5, 15), LocalDate.of(2026, 8, 30),
                "Temporary absence for internship", "admin", LocalDateTime.now().minusDays(20));
        temporaryRecord("TRR-DEMO-NAM-PERM", "RES-NAM003", ResidenceRecordType.PERMANENT_REGISTRATION,
                "HH-A1201", LocalDate.of(2026, 4, 10), null,
                "Permanent registration update", "admin", LocalDateTime.now().minusMonths(2));
    }

    private void seedPaymentProofs() {
        paymentProof("PRF-DEMO-PENDING-001", "AF-DEMO-A-MGMT-202606", "500000",
                "https://example.com/proofs/demo-a-mgmt.png", "Resident uploaded transfer screenshot",
                "TXN-DEMO-A-001", "Nguyen Van An", PaymentProof.ProofStatus.PENDING, LocalDateTime.now().minusHours(8));
        paymentProof("PRF-DEMO-PENDING-002", "AF-DEMO-G-WATER-202606", "250000",
                "https://example.com/proofs/demo-g-water.png", "Needs accountant review",
                "TXN-DEMO-G-002", "Doan Gia Khanh", PaymentProof.ProofStatus.PENDING, LocalDateTime.now().minusHours(3));
        paymentProof("PRF-DEMO-REJECTED-001", "AF-DEMO-E-WASTE-202606", "72000",
                "https://example.com/proofs/demo-e-waste.png", "Rejected demo proof",
                "TXN-DEMO-E-003", "Vo Thi Hoa", PaymentProof.ProofStatus.REJECTED, LocalDateTime.now().minusDays(1));
    }

    private void seedActivityLogs() {
        activity("LOG-DEMO-001", "admin", "CREATE", "HOUSEHOLD", "HH-C0901",
                "Created household HH-C0901 for apartment C0901", LocalDateTime.now().minusDays(3));
        activity("LOG-DEMO-002", "admin", "CREATE", "RESIDENT", "RES-MINH007",
                "Created resident Pham Quang Minh", LocalDateTime.now().minusDays(3).plusMinutes(10));
        activity("LOG-DEMO-003", "accountant", "REGISTER_VEHICLE", "VEHICLE", "VH-C-001",
                "Registered car 30G-090.10 for household HH-C0901", LocalDateTime.now().minusDays(2));
        activity("LOG-DEMO-004", "resident1", "TEMPORARY_RESIDENCE", "RESIDENT", "RES-DUC004",
                "Created temporary residence record for Pham Minh Duc", LocalDateTime.now().minusDays(1));
        activity("LOG-DEMO-005", "accountant", "PAYMENT_PROOF", "PAYMENT", "PRF-DEMO-PENDING-001",
                "Resident submitted payment proof awaiting accountant review", LocalDateTime.now().minusHours(8));
    }

    private void seedNotifications() {
        notification("NOTIF-DEMO-ADMIN-001", "admin", "System is ready",
                "Docker services, backend API, and rich demo seed data are ready for manual testing.");
        notification("NOTIF-DEMO-ACCOUNTANT-001", "accountant", "Payment review",
                "Pending payment proofs and mixed paid/unpaid fees are available in the payment module.");
        notification("NOTIF-DEMO-RESIDENT-001", "resident1", "New bill available",
                "Your June 2026 sample bill is ready for review.");
        notification("NOTIF-DEMO-RESIDENT-002", "resident2", "Payment proof pending",
                "Your partial water payment proof is available for accountant review.");
    }

    private Household household(
            String id,
            String apartmentNo,
            int floor,
            double area,
            String ownerName,
            String phone,
            String houseNo,
            String street,
            String ward,
            String district,
            LocalDate registrationDate,
            int motorcycleCount,
            int carCount,
            HouseholdStatus status,
            String note) {
        Household household = householdRepository.findById(id).orElseGet(() -> {
            Household created = new Household();
            created.setId(id);
            return created;
        });
        household.setApartmentNo(apartmentNo);
        household.setFloor(floor);
        household.setArea(area);
        household.setOwnerName(ownerName);
        household.setPhone(phone);
        household.setHouseNo(houseNo);
        household.setStreet(street);
        household.setWard(ward);
        household.setDistrict(district);
        household.setRegistrationDate(registrationDate);
        household.setMotorcycleCount(motorcycleCount);
        household.setCarCount(carCount);
        household.setStatus(status);
        household.setNote(note);
        household.setArchived(false);
        household.setArchivedAt(null);
        if (household.getBalance() == null) {
            household.setBalance(BigDecimal.ZERO);
        }
        return householdRepository.save(household);
    }

    private Resident resident(
            String id,
            Household household,
            String fullName,
            String gender,
            LocalDate dateOfBirth,
            String identityNo,
            String phone,
            String relationship,
            ResidentStatus status,
            boolean alive,
            LocalDate dateOfDeath,
            String occupation,
            String workplace,
            String previousResidence) {
        Resident resident = residentRepository.findById(id)
                .orElseGet(() -> residentRepository.findByIdentityNoIgnoreCase(identityNo).orElseGet(() -> {
                    Resident created = new Resident();
                    created.setId(id);
                    return created;
                }));
        resident.setFullName(fullName);
        resident.setGender(gender);
        resident.setDateOfBirth(dateOfBirth);
        resident.setIdentityNo(identityNo);
        resident.setPhone(phone);
        resident.setBirthPlace("Hanoi");
        resident.setHometown("Hanoi");
        resident.setEthnicity("Kinh");
        resident.setReligion("None");
        resident.setOccupation(occupation);
        resident.setWorkplace(workplace);
        resident.setIssueDate(LocalDate.of(2021, 1, 10));
        resident.setIssuePlace("Police Department");
        resident.setPreviousResidence(previousResidence);
        resident.setRelationshipToHead(relationship);
        resident.setStatus(status);
        resident.setHousehold(household);
        resident.setAlive(alive);
        resident.setDateOfDeath(dateOfDeath);
        resident.setArchived(false);
        resident.setArchivedAt(null);
        return residentRepository.save(resident);
    }

    private void setHead(Household household, Resident head) {
        household.setHeadResident(head);
        household.setOwnerName(head.getFullName());
        if (household.getPhone() == null || household.getPhone().isBlank()) {
            household.setPhone(head.getPhone());
        }
        householdRepository.save(household);
    }

    private void syncMemberCounts(List<Household> households) {
        households.forEach(household -> {
            household.setMembersCount((int) residentRepository.countActiveMembers(household.getId()));
            householdRepository.save(household);
        });
    }

    private void upsertUser(
            String username,
            String rawPassword,
            String email,
            String fullname,
            String room,
            String phone,
            String identityNo,
            UserRole role,
            UserStatus status,
            int failedAttempts,
            LocalDateTime lockTime) {
        User user = userRepository.findByUsername(username).orElseGet(() -> User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .build());
        user.setEmail(email);
        user.setFullname(fullname);
        user.setRoom(room);
        user.setPhone(phone);
        user.setIdentityNo(identityNo);
        user.setRole(role);
        user.setStatus(status);
        user.setFailedAttempts(failedAttempts);
        user.setLockTime(lockTime);
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
        }
        userRepository.saveAndFlush(user);
    }

    private void vehicle(String id, String plateNumber, String type, String ownerName, LocalDate registrationDate, String householdId) {
        Household household = requireHousehold(householdId);
        Vehicle vehicle = vehicleRepository.findById(id).orElseGet(() -> Vehicle.builder().id(id).build());
        vehicle.setPlateNumber(plateNumber);
        vehicle.setType(type);
        vehicle.setOwnerName(ownerName);
        vehicle.setRegistrationDate(registrationDate);
        vehicle.setHousehold(household);
        vehicleRepository.save(vehicle);
    }

    private Fee fee(String id, String name, FeeType type, CalcMethod calcMethod, String price) {
        Fee fee = feeRepository.findById(id).orElseGet(() -> Fee.builder().id(id).build());
        fee.setName(name);
        fee.setType(type);
        fee.setCalcMethod(calcMethod);
        fee.setPrice(money(price));
        return feeRepository.save(fee);
    }

    private CollectionPeriod period(String id, String name, PeriodStatus status, LocalDateTime createdAt) {
        CollectionPeriod period = collectionPeriodRepository.findById(id).orElseGet(() -> CollectionPeriod.builder().id(id).build());
        period.setName(name);
        period.setStatus(status);
        period.setCreatedAt(createdAt);
        return collectionPeriodRepository.save(period);
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
        AssignedFee assignedFee = assignedFeeRepository.findById(id).orElseGet(() -> AssignedFee.builder().id(id).build());
        assignedFee.setHousehold(household);
        assignedFee.setPeriod(period);
        assignedFee.setFee(fee);
        assignedFee.setQuantity(quantity);
        assignedFee.setStatus(status);
        assignedFee.setAmountPaidAccumulated(amountPaid);
        assignedFee.setPaidAt(paidAt);
        return assignedFeeRepository.save(assignedFee);
    }

    private void receipt(String id, AssignedFee assignedFee, BigDecimal amount, String note, String createdBy, ReceiptStatus status) {
        Receipt receipt = receiptRepository.findById(id).orElseGet(() -> Receipt.builder().id(id).build());
        receipt.setAssignedFee(assignedFee);
        receipt.setAmountPaid(amount);
        receipt.setPaidAt(assignedFee.getPaidAt() != null ? assignedFee.getPaidAt() : LocalDateTime.now());
        receipt.setNote(note);
        receipt.setCreatedBy(createdBy);
        receipt.setPayerName(assignedFee.getHousehold().getOwnerName());
        receipt.setStatus(status);
        receipt.setIdempotencyKey(id);
        receiptRepository.save(receipt);
    }

    private void utilityRecord(String id, Household household, CollectionPeriod period, int oldIndex, int newIndex) {
        UtilityRecord record = utilityRecordRepository.findById(id).orElseGet(() -> UtilityRecord.builder().id(id).build());
        record.setHousehold(household);
        record.setPeriod(period);
        record.setType("WATER");
        record.setOldIndex(oldIndex);
        record.setNewIndex(newIndex);
        utilityRecordRepository.save(record);
    }

    private void temporaryRecord(
            String id,
            String residentId,
            ResidenceRecordType type,
            String address,
            LocalDate startDate,
            LocalDate endDate,
            String reason,
            String actor,
            LocalDateTime createdAt) {
        Resident resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new RuntimeException("Demo resident not found: " + residentId));
        TemporaryResidenceRecord record = temporaryResidenceRecordRepository.findById(id)
                .orElseGet(() -> TemporaryResidenceRecord.builder().id(id).build());
        record.setResident(resident);
        record.setType(type);
        record.setAddress(address);
        record.setStartDate(startDate);
        record.setEndDate(endDate);
        record.setReason(reason);
        record.setActor(actor);
        record.setCreatedAt(createdAt);
        temporaryResidenceRecordRepository.save(record);
    }

    private void paymentProof(
            String id,
            String assignedFeeId,
            String amount,
            String proofImage,
            String note,
            String transactionId,
            String payerName,
            PaymentProof.ProofStatus status,
            LocalDateTime submittedAt) {
        AssignedFee assignedFee = assignedFeeRepository.findById(assignedFeeId)
                .orElseThrow(() -> new RuntimeException("Demo assigned fee not found: " + assignedFeeId));
        PaymentProof proof = paymentProofRepository.findById(id).orElseGet(() -> PaymentProof.builder().id(id).build());
        proof.setAssignedFee(assignedFee);
        proof.setAmount(money(amount));
        proof.setProofImage(proofImage);
        proof.setNote(note);
        proof.setTransactionId(transactionId);
        proof.setPayerName(payerName);
        proof.setStatus(status);
        proof.setSubmittedAt(submittedAt);
        paymentProofRepository.save(proof);
    }

    private void activity(String id, String actor, String action, String targetType, String targetId, String detail, LocalDateTime createdAt) {
        ResidentActivityLog log = residentActivityLogRepository.findById(id).orElseGet(() -> ResidentActivityLog.builder().id(id).build());
        log.setActor(actor);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetail(detail);
        log.setCreatedAt(createdAt);
        residentActivityLogRepository.save(log);
    }

    private void notification(String id, String targetUsername, String title, String content) {
        if (userRepository.findByUsername(targetUsername).isEmpty()) {
            return;
        }
        Notification notification = notificationRepository.findById(id).orElseGet(() -> Notification.builder().id(id).build());
        notification.setTargetUsername(targetUsername);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setRead(false);
        if (notification.getCreatedAt() == null) {
            notification.setCreatedAt(LocalDateTime.now());
        }
        notificationRepository.save(notification);
    }

    private Household requireHousehold(String id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demo household not found: " + id));
    }

    private BigDecimal requiredAmount(Household household, Fee fee, double quantity) {
        return switch (fee.getCalcMethod()) {
            case PER_M2 -> fee.getPrice().multiply(BigDecimal.valueOf(household.getArea()));
            case PER_PERSON -> fee.getPrice().multiply(BigDecimal.valueOf(Math.max(1, household.getMembersCount())));
            case PER_MOTORCYCLE -> fee.getPrice().multiply(BigDecimal.valueOf(Math.max(0, household.getMotorcycleCount())));
            case PER_CAR -> fee.getPrice().multiply(BigDecimal.valueOf(Math.max(0, household.getCarCount())));
            case CONSUMPTION, PER_VEHICLE, FIXED -> fee.getPrice().multiply(BigDecimal.valueOf(quantity));
        };
    }

    private BigDecimal money(String value) {
        return new BigDecimal(value);
    }
}
