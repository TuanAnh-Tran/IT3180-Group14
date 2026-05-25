package com.fee.system.services;

import com.fee.system.config.AppConfig;
import com.fee.system.models.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * BỘ QUẢN LÝ NGHIỆP VỤ CHÍNH (SERVICE LAYER - FEEMANAGER)
 * Điều phối toàn bộ dữ liệu trong bộ nhớ (Ram Lists), thực hiện các logic CRUD,
 * gán phí, tính toán tiền hóa đơn và tổng hợp báo cáo tài chính của đợt thu.
 */
public class FeeManager {
    // Lưu trữ danh sách dữ liệu trong RAM (Mô phỏng Database)
    private List<Fee> fees = new ArrayList<>();
    private List<CollectionPeriod> periods = new ArrayList<>();
    private List<Household> households = new ArrayList<>();
    private List<AssignedFee> assignedFees = new ArrayList<>();

    public FeeManager() {
        // Constructor khởi tạo bộ quản lý trống
    }

    // ==========================================================================
    // 1. PHÂN HỆ QUẢN LÝ DANH MỤC KHOẢN THU (FEE CRUD LOGIC)
    // ==========================================================================

    /**
     * Tạo một khoản thu dịch vụ / ủng hộ mới
     * @param name Tên khoản thu (VD: Tiền nước sinh hoạt)
     * @param type Tính chất (Bắt buộc COMPULSORY / Tự nguyện VOLUNTARY)
     * @param calcMethod Cách tính tiền (Cố định, Nhân khẩu, Diện tích, Đo đạc)
     * @param price Đơn giá / Số tiền
     * @return Đối tượng Fee vừa tạo
     */
    public Fee createFee(String name, Fee.FeeType type, Fee.CalcMethod calcMethod, double price) {
        // Sinh ID tự động duy nhất bằng UUID rút gọn
        String id = "FEE_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Fee newFee = new Fee(id, name, type, calcMethod, price);
        fees.add(newFee);
        return newFee;
    }

    /**
     * Chỉnh sửa thông tin cấu hình của khoản thu
     * @param id Mã khoản thu cần tìm sửa
     * @param name Tên mới
     * @param type Tính chất mới
     * @param calcMethod Cách tính tiền mới
     * @param price Đơn giá mới
     * @return Đối tượng Fee sau khi sửa thành công hoặc null nếu không tìm thấy
     */
    public Fee updateFee(String id, String name, Fee.FeeType type, Fee.CalcMethod calcMethod, double price) {
        for (Fee fee : fees) {
            if (fee.getId().equals(id)) {
                fee.setName(name);
                fee.setType(type);
                fee.setCalcMethod(calcMethod);
                fee.setPrice(price);
                return fee;
            }
        }
        return null;
    }

    /**
     * Xóa một khoản thu khỏi hệ thống.
     * Logic đặc biệt: Thực hiện Xóa liên kết Bắc Cầu (Cascading Delete):
     * - Loại bỏ khoản thu ra khỏi danh sách áp dụng của các Đợt thu.
     * - Xóa toàn bộ lượt gán (hóa đơn chưa đóng) của các hộ dân liên quan đến phí này để tránh rác dữ liệu.
     * @param id Mã khoản thu cần xóa
     * @return true nếu xóa thành công, false nếu ngược lại
     */
    public boolean deleteFee(String id) {
        Fee feeToDelete = null;
        for (Fee fee : fees) {
            if (fee.getId().equals(id)) {
                feeToDelete = fee;
                break;
            }
        }
        if (feeToDelete == null) return false;

        // Xóa khỏi danh mục chính
        fees.remove(feeToDelete);

        // Bước 1: Dọn dẹp trong các đợt thu đang chứa phí này
        for (CollectionPeriod period : periods) {
            period.getFeeIds().remove(id);
        }

        // Bước 2: Dọn dẹp toàn bộ lượt gán phí liên quan đến phí này của các hộ dân
        assignedFees.removeIf(af -> af.getFeeId().equals(id));
        return true;
    }

    // ==========================================================================
    // 2. PHÂN HỆ QUẢN LÝ ĐỢT THU PHÍ (COLLECTION PERIODS LOGIC)
    // ==========================================================================

    /**
     * Tạo một đợt thu tiền định kỳ mới và liên kết các khoản thu áp dụng.
     * Logic đặc biệt: Khi tạo đợt thu mới, hệ thống tự động quét toàn bộ hộ dân hiện có và
     * tự động tạo lượt gán nộp phí đối với các khoản Bắt buộc (COMPULSORY) trong đợt đó.
     * @param name Tên đợt thu (VD: Đợt thu tháng 5/2026)
     * @param feeIds Mảng chứa mã các khoản phí áp dụng cho đợt này
     * @return Đối tượng đợt thu vừa tạo
     */
    public CollectionPeriod createPeriod(String name, List<String> feeIds) {
        String id = "PER_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CollectionPeriod newPeriod = new CollectionPeriod(id, name, feeIds);
        periods.add(newPeriod);

        // Kích hoạt tự động quét gán phí bắt buộc cho mọi hộ dân
        autoAssignCompulsoryFees(newPeriod.getId(), feeIds);
        return newPeriod;
    }

    /**
     * Đóng / khóa đợt thu để hoàn tất và lưu trữ báo cáo
     * @param id Mã đợt thu
     */
    public void closePeriod(String id) {
        for (CollectionPeriod period : periods) {
            if (period.getId().equals(id)) {
                period.setStatus(CollectionPeriod.PeriodStatus.CLOSED);
                break;
            }
        }
    }

    // ==========================================================================
    // 3. PHÂN HỆ QUẢN LÝ HỘ DÂN (HOUSEHOLDS CRUD LOGIC)
    // ==========================================================================

    /**
     * Thêm một căn hộ/hộ dân mới vào hệ thống quản lý
     * Logic đặc biệt: Khi thêm một hộ mới, tự động đối chiếu các Đợt thu đang hoạt động (ACTIVE)
     * và tự động gán các khoản Bắt buộc của đợt đó cho hộ mới này.
     * @param id Mã căn hộ (VD: P101) - Không được trùng
     * @param ownerName Họ tên chủ hộ
     * @param membersCount Số người sinh sống
     * @param area Diện tích m2
     * @param motorcycleCount Số xe máy đăng ký
     * @param carCount Số ô tô đăng ký
     * @return Đối tượng Household vừa tạo
     */
    public Household createHousehold(String id, String ownerName, int membersCount, double area, int motorcycleCount, int carCount) {
        // Kiểm tra trùng lặp mã hộ dân
        for (Household hh : households) {
            if (hh.getId().equalsIgnoreCase(id)) {
                throw new IllegalArgumentException("Mã hộ gia đình '" + id + "' đã tồn tại.");
            }
        }
        Household newHh = new Household(id, ownerName, membersCount, area, motorcycleCount, carCount);
        households.add(newHh);

        // Tự động quét gán các khoản phí bắt buộc của các đợt thu đang hoạt động cho hộ mới này
        for (CollectionPeriod period : periods) {
            if (period.getStatus() == CollectionPeriod.PeriodStatus.ACTIVE) {
                autoAssignCompulsoryFeesToSingleHousehold(newHh, period.getId(), period.getFeeIds());
            }
        }
        return newHh;
    }

    /**
     * Xóa một hộ gia đình ra khỏi hệ thống dọn dẹp các phân bổ đóng phí
     * @param id Mã hộ dân cần xóa
     * @return true nếu xóa thành công
     */
    public boolean deleteHousehold(String id) {
        boolean removed = households.removeIf(h -> h.getId().equalsIgnoreCase(id));
        if (removed) {
            // Xóa toàn bộ hóa đơn gán phí của hộ này
            assignedFees.removeIf(af -> af.getHouseholdId().equalsIgnoreCase(id));
        }
        return removed;
    }

    // ==========================================================================
    // 4. PHÂN HỆ PHÂN BỔ VÀ GÁN PHÍ CHO HỘ DÂN (ASSIGNMENT LOGIC)
    // ==========================================================================

    /**
     * Quét tự động gán các khoản thu BẮT BUỘC cho toàn bộ hộ dân, và gán TỰ ĐỘNG phí gửi xe cho hộ có đăng ký
     */
    private void autoAssignCompulsoryFees(String periodId, List<String> feeIds) {
        // Lấy tất cả phí trong đợt thu này
        List<Fee> activeFees = fees.stream()
                .filter(f -> feeIds.contains(f.getId()))
                .collect(Collectors.toList());

        String motoFeeName = AppConfig.getProperty("fee.vehicle.name", "Phi gui xe may");
        String carFeeName = AppConfig.getProperty("fee.car.name", "Phi gui xe o to");

        for (Household hh : households) {
            for (Fee fee : activeFees) {
                // Kiểm tra xem đã được gán chưa để tránh trùng lặp
                boolean alreadyAssigned = assignedFees.stream()
                        .anyMatch(af -> af.getHouseholdId().equalsIgnoreCase(hh.getId()) 
                                && af.getPeriodId().equalsIgnoreCase(periodId) 
                                && af.getFeeId().equalsIgnoreCase(fee.getId()));

                if (alreadyAssigned) continue;

                boolean shouldAssign = false;
                double defaultQty = 1.0;

                // Trường hợp 1: Khoản thu Bắt buộc (COMPULSORY) áp dụng cho mọi hộ dân
                if (fee.getType() == Fee.FeeType.COMPULSORY) {
                    shouldAssign = true;
                    if (fee.getCalcMethod() == Fee.CalcMethod.PER_MEMBER) {
                        defaultQty = hh.getMembersCount(); // Nhân khẩu làm lượng thu
                    } else if (fee.getCalcMethod() == Fee.CalcMethod.PER_AREA) {
                        defaultQty = hh.getArea();         // Diện tích làm lượng thu
                    } else if (fee.getCalcMethod() == Fee.CalcMethod.CONSUMPTION) {
                        defaultQty = 0.0;                  // Chỉ số đo đạc lúc bắt đầu = 0
                    }
                }
                // Trường hợp 2: Phí gửi xe máy (Tự động gán nếu hộ dân có đăng ký xe máy > 0)
                else if (fee.getName().equalsIgnoreCase(motoFeeName) && hh.getMotorcycleCount() > 0) {
                    shouldAssign = true;
                    defaultQty = hh.getMotorcycleCount();
                }
                // Trường hợp 3: Phí gửi xe ô tô (Tự động gán nếu hộ dân có đăng ký ô tô > 0)
                else if (fee.getName().equalsIgnoreCase(carFeeName) && hh.getCarCount() > 0) {
                    shouldAssign = true;
                    defaultQty = hh.getCarCount();
                }

                if (shouldAssign) {
                    String afId = "ASF_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    assignedFees.add(new AssignedFee(afId, hh.getId(), periodId, fee.getId(), defaultQty));
                }
            }
        }
    }

    /**
     * Quét tự động gán các khoản thu bắt buộc và phí gửi xe cho MỘT hộ dân mới được tạo
     */
    private void autoAssignCompulsoryFeesToSingleHousehold(Household hh, String periodId, List<String> feeIds) {
        List<Fee> activeFees = fees.stream()
                .filter(f -> feeIds.contains(f.getId()))
                .collect(Collectors.toList());

        String motoFeeName = AppConfig.getProperty("fee.vehicle.name", "Phi gui xe may");
        String carFeeName = AppConfig.getProperty("fee.car.name", "Phi gui xe o to");

        for (Fee fee : activeFees) {
            boolean shouldAssign = false;
            double defaultQty = 1.0;

            if (fee.getType() == Fee.FeeType.COMPULSORY) {
                shouldAssign = true;
                if (fee.getCalcMethod() == Fee.CalcMethod.PER_MEMBER) {
                    defaultQty = hh.getMembersCount();
                } else if (fee.getCalcMethod() == Fee.CalcMethod.PER_AREA) {
                    defaultQty = hh.getArea();
                } else if (fee.getCalcMethod() == Fee.CalcMethod.CONSUMPTION) {
                    defaultQty = 0.0;
                }
            }
            else if (fee.getName().equalsIgnoreCase(motoFeeName) && hh.getMotorcycleCount() > 0) {
                shouldAssign = true;
                defaultQty = hh.getMotorcycleCount();
            }
            else if (fee.getName().equalsIgnoreCase(carFeeName) && hh.getCarCount() > 0) {
                shouldAssign = true;
                defaultQty = hh.getCarCount();
            }

            if (shouldAssign) {
                String afId = "ASF_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                assignedFees.add(new AssignedFee(afId, hh.getId(), periodId, fee.getId(), defaultQty));
            }
        }
    }

    /**
     * Gán thủ công một khoản phí (Tự nguyện) hoặc CẬP NHẬT chỉ số tiêu thụ điện nước
     * @param householdId Mã hộ
     * @param periodId Mã đợt thu
     * @param feeId Mã khoản thu
     * @param quantity Lượng thu (Số xe gửi đăng ký thêm, số khối nước đo thực tế)
     * @return Đối tượng AssignedFee phân bổ
     */
    public AssignedFee assignFeeToHousehold(String householdId, String periodId, String feeId, double quantity) {
        // Tìm xem hộ đã được gán phí này trong đợt chưa (Nếu rồi -> Cập nhật số lượng tiêu dùng mới)
        for (AssignedFee af : assignedFees) {
            if (af.getHouseholdId().equalsIgnoreCase(householdId) 
                    && af.getPeriodId().equalsIgnoreCase(periodId) 
                    && af.getFeeId().equalsIgnoreCase(feeId)) {
                af.setQuantity(quantity);
                return af; 
            }
        }

        // Nếu chưa gán (Khoản tự nguyện đăng ký thêm) -> Tạo lượt gán mới
        String id = "ASF_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        AssignedFee newAssigned = new AssignedFee(id, householdId, periodId, feeId, quantity);
        assignedFees.add(newAssigned);
        return newAssigned;
    }

    /**
     * Hủy gán một khoản phí (không đóng nữa) đối với khoản tự nguyện
     */
    public boolean unassignFeeFromHousehold(String householdId, String periodId, String feeId) {
        return assignedFees.removeIf(af -> af.getHouseholdId().equalsIgnoreCase(householdId) 
                && af.getPeriodId().equalsIgnoreCase(periodId) 
                && af.getFeeId().equalsIgnoreCase(feeId));
    }

    /**
     * Xác nhận đóng tiền (Thanh toán) ghi nhận mốc thời gian nộp phí
     * @param assignedFeeId Mã lượt gán đóng phí cần thanh toán
     */
    public boolean payAssignedFee(String assignedFeeId) {
        for (AssignedFee af : assignedFees) {
            if (af.getId().equalsIgnoreCase(assignedFeeId)) {
                af.setStatus(AssignedFee.PaymentStatus.PAID);
                af.setPaidAt(LocalDateTime.now()); // Lưu mốc thời gian đóng
                return true;
            }
        }
        return false;
    }

    /**
     * Hoàn tác thanh toán (Chuyển trạng thái từ Đã đóng về Chưa đóng)
     */
    public boolean unpayAssignedFee(String assignedFeeId) {
        for (AssignedFee af : assignedFees) {
            if (af.getId().equalsIgnoreCase(assignedFeeId)) {
                af.setStatus(AssignedFee.PaymentStatus.UNPAID);
                af.setPaidAt(null); // Xóa thời gian đóng
                return true;
            }
        }
        return false;
    }

    // ==========================================================================
    // 5. PHÂN HỆ TÍNH TOÁN TIỀN PHẢI THU (CALCULATIONS & DTO LAYER)
    // ==========================================================================

    // --- CẤU TRÚC DTO (DATA TRANSFER OBJECTS) ĐÓNG GÓI KẾT QUẢ TÍNH ---

    /**
     * DTO đại diện cho một Dòng Hóa Đơn Chi Tiết
     */
    public static class BillItem {
        private String assignedFeeId;
        private String feeId;
        private String feeName;
        private Fee.FeeType feeType;
        private Fee.CalcMethod calcMethod;
        private double price;
        private double quantity;
        private double amount; // Thành tiền = price * quantity
        private AssignedFee.PaymentStatus status;
        private LocalDateTime paidAt;

        public BillItem(String assignedFeeId, String feeId, String feeName, Fee.FeeType feeType, 
                        Fee.CalcMethod calcMethod, double price, double quantity, double amount, 
                        AssignedFee.PaymentStatus status, LocalDateTime paidAt) {
            this.assignedFeeId = assignedFeeId;
            this.feeId = feeId;
            this.feeName = feeName;
            this.feeType = feeType;
            this.calcMethod = calcMethod;
            this.price = price;
            this.quantity = quantity;
            this.amount = amount;
            this.status = status;
            this.paidAt = paidAt;
        }

        public String getAssignedFeeId() { return assignedFeeId; }
        public String getFeeId() { return feeId; }
        public String getFeeName() { return feeName; }
        public Fee.FeeType getFeeType() { return feeType; }
        public Fee.CalcMethod getCalcMethod() { return calcMethod; }
        public double getPrice() { return price; }
        public double getQuantity() { return quantity; }
        public double getAmount() { return amount; }
        public AssignedFee.PaymentStatus getStatus() { return status; }
        public LocalDateTime getPaidAt() { return paidAt; }
    }

    /**
     * DTO đại diện cho Hóa Đơn Chi Tiết của một Hộ Gia Đình
     */
    public static class HouseholdBill {
        private String householdId;
        private String ownerName;
        private int membersCount;
        private double area;
        private List<BillItem> items; // Danh sách hóa đơn chi tiết từng khoản
        private double totalAmount;   // Tổng cộng tiền phải thanh toán
        private double totalPaid;     // Tổng số tiền đã thanh toán
        private double totalUnpaid;   // Số tiền còn nợ đọng

        public HouseholdBill(String householdId, String ownerName, int membersCount, double area, 
                             List<BillItem> items, double totalAmount, double totalPaid, double totalUnpaid) {
            this.householdId = householdId;
            this.ownerName = ownerName;
            this.membersCount = membersCount;
            this.area = area;
            this.items = items;
            this.totalAmount = totalAmount;
            this.totalPaid = totalPaid;
            this.totalUnpaid = totalUnpaid;
        }

        public String getHouseholdId() { return householdId; }
        public String getOwnerName() { return ownerName; }
        public int getMembersCount() { return membersCount; }
        public double getArea() { return area; }
        public List<BillItem> getItems() { return items; }
        public double getTotalAmount() { return totalAmount; }
        public double getTotalPaid() { return totalPaid; }
        public double getTotalUnpaid() { return totalUnpaid; }
    }

    /**
     * DTO đại diện cho Báo Cáo Thống Kê Tiến Độ Tài Chính Đợt Thu
     */
    public static class PeriodStats {
        private String periodId;
        private String periodName;
        private double totalExpected;   // Tổng số tiền dự kiến cần thu (100% mục tiêu)
        private double totalCollected;  // Tổng số tiền mặt đã thu được
        private double totalRemaining;  // Số tiền còn thiếu nợ đọng
        private int completionRate;     // Tỷ lệ hoàn thành đợt thu (%)
        private int totalAssignments;   // Tổng số lượt gán hóa đơn
        private int paidAssignments;    // Số lượt hóa đơn đã được thanh toán

        public PeriodStats(String periodId, String periodName, double totalExpected, double totalCollected, 
                           double totalRemaining, int completionRate, int totalAssignments, int paidAssignments) {
            this.periodId = periodId;
            this.periodName = periodName;
            this.totalExpected = totalExpected;
            this.totalCollected = totalCollected;
            this.totalRemaining = totalRemaining;
            this.completionRate = completionRate;
            this.totalAssignments = totalAssignments;
            this.paidAssignments = paidAssignments;
        }

        public String getPeriodId() { return periodId; }
        public String getPeriodName() { return periodName; }
        public double getTotalExpected() { return totalExpected; }
        public double getTotalCollected() { return totalCollected; }
        public double getTotalRemaining() { return totalRemaining; }
        public int getCompletionRate() { return completionRate; }
        public int getTotalAssignments() { return totalAssignments; }
        public int getPaidAssignments() { return paidAssignments; }
    }

    // --- CÁC PHƯƠNG THỨC TÍNH TOÁN SỐ LIỆU CHÍNH ---

    /**
     * TÍNH TOÁN CHI TIẾT HÓA ĐƠN HỘ DÂN (ALGORITHM)
     * Quét tất cả phân bổ phí của hộ dân trong đợt thu, truy vấn đơn giá tương ứng
     * và nhân số lượng (diện tích, người, chỉ số nước) để tính ra thành tiền cụ thể.
     */
    public HouseholdBill calculateHouseholdBill(String householdId, String periodId) {
        // Tìm thông tin hộ dân
        Household hh = households.stream()
                .filter(h -> h.getId().equalsIgnoreCase(householdId))
                .findFirst()
                .orElse(null);

        if (hh == null) {
            return new HouseholdBill(householdId, "Không rõ", 0, 0.0, new ArrayList<>(), 0.0, 0.0, 0.0);
        }

        // Lọc toàn bộ lượt gán phí của hộ trong đợt thu này
        List<AssignedFee> hhAssigned = assignedFees.stream()
                .filter(af -> af.getHouseholdId().equalsIgnoreCase(householdId) && af.getPeriodId().equalsIgnoreCase(periodId))
                .collect(Collectors.toList());

        List<BillItem> items = new ArrayList<>();
        double totalAmount = 0.0;
        double totalPaid = 0.0;
        double totalUnpaid = 0.0;

        for (AssignedFee af : hhAssigned) {
            // Truy vấn đơn giá khoản thu liên quan
            Fee fee = fees.stream()
                    .filter(f -> f.getId().equalsIgnoreCase(af.getFeeId()))
                    .findFirst()
                    .orElse(null);

            if (fee != null) {
                // Áp dụng công thức tính toán: Thành tiền = Đơn giá * Số lượng lượng đóng
                double amount = fee.getPrice() * af.getQuantity();

                if (af.getStatus() == AssignedFee.PaymentStatus.PAID) {
                    totalPaid += amount;
                } else {
                    totalUnpaid += amount;
                }
                totalAmount += amount;

                // Tạo đối tượng dòng hóa đơn DTO
                items.add(new BillItem(
                        af.getId(),
                        fee.getId(),
                        fee.getName(),
                        fee.getType(),
                        fee.getCalcMethod(),
                        fee.getPrice(),
                        af.getQuantity(),
                        amount,
                        af.getStatus(),
                        af.getPaidAt()
                ));
            }
        }

        return new HouseholdBill(hh.getId(), hh.getOwnerName(), hh.getMembersCount(), hh.getArea(), 
                                 items, totalAmount, totalPaid, totalUnpaid);
    }

    /**
     * TÍNH TOÁN TIẾN ĐỘ THỐNG KÊ CHIẾN DỊCH ĐỢT THU (ALGORITHM)
     * Tính tổng hợp tài chính của toàn đợt thu phục vụ báo cáo Dashboard.
     */
    public PeriodStats calculatePeriodStats(String periodId) {
        CollectionPeriod period = periods.stream()
                .filter(p -> p.getId().equalsIgnoreCase(periodId))
                .findFirst()
                .orElse(null);

        if (period == null) {
            return new PeriodStats(periodId, "Không rõ", 0.0, 0.0, 0.0, 0, 0, 0);
        }

        double totalExpected = 0.0;
        double totalCollected = 0.0;
        int totalAssignments = 0;
        int paidAssignments = 0;

        // Quét toàn bộ lượt gán đóng phí trong đợt này của mọi hộ gia đình
        for (AssignedFee af : assignedFees) {
            if (af.getPeriodId().equalsIgnoreCase(periodId)) {
                Fee fee = fees.stream()
                        .filter(f -> f.getId().equalsIgnoreCase(af.getFeeId()))
                        .findFirst()
                        .orElse(null);

                if (fee != null) {
                    double amount = fee.getPrice() * af.getQuantity();
                    totalExpected += amount; // Cộng dồn tiền dự kiến phải thu
                    totalAssignments++;

                    if (af.getStatus() == AssignedFee.PaymentStatus.PAID) {
                        totalCollected += amount; // Cộng dồn tiền mặt thực tế đã thu được
                        paidAssignments++;
                    }
                }
            }
        }

        double totalRemaining = totalExpected - totalCollected; // Tiền nợ đọng
        // Tính tỷ lệ hoàn thành làm tròn số
        int completionRate = totalExpected > 0 ? (int) Math.round((totalCollected / totalExpected) * 100) : 0;

        return new PeriodStats(
                period.getId(),
                period.getName(),
                totalExpected,
                totalCollected,
                totalRemaining,
                completionRate,
                totalAssignments,
                paidAssignments
        );
    }

    // --- CÁC PHƯƠNG THỨC TRUY VẤN DANH SÁCH DỮ LIỆU ---
    public List<Fee> getFees() { return fees; }
    public List<CollectionPeriod> getPeriods() { return periods; }
    public List<Household> getHouseholds() { return households; }
    public List<AssignedFee> getAssignedFees() { return assignedFees; }

    // ==========================================================================
    // 6. PHÂN HỆ KHỞI TẠO DỮ LIỆU CHẠY THỬ NGHIỆM (SAMPLE SEED DATA)
    // ==========================================================================
    
    public void initSampleData() {
        // Tạo 6 danh mục khoản thu mẫu lấy giá trị từ cấu hình ngoài (AppConfig)
        String f1Name = AppConfig.getProperty("fee.management.name", "Phi dich vu chung cu");
        double f1Price = AppConfig.getDoubleProperty("fee.management.price", 7000.0);

        String f2Name = AppConfig.getProperty("fee.vehicle.name", "Phi gui xe may");
        double f2Price = AppConfig.getDoubleProperty("fee.vehicle.price", 70000.0);

        String f3Name = AppConfig.getProperty("fee.water.name", "Tien nuoc sinh hoat");
        double f3Price = AppConfig.getDoubleProperty("fee.water.price", 15000.0);

        String f4Name = AppConfig.getProperty("fee.charity.name", "Quy ung ho bao lut");
        double f4Price = AppConfig.getDoubleProperty("fee.charity.price", 50000.0);

        String f5Name = AppConfig.getProperty("fee.security.name", "Phi an ninh to dan pho");
        double f5Price = AppConfig.getDoubleProperty("fee.security.price", 10000.0);

        String f6Name = AppConfig.getProperty("fee.car.name", "Phi gui xe o to");
        double f6Price = AppConfig.getDoubleProperty("fee.car.price", 1200000.0);

        Fee f1 = createFee(f1Name, Fee.FeeType.COMPULSORY, Fee.CalcMethod.PER_AREA, f1Price);  
        Fee f2 = createFee(f2Name, Fee.FeeType.VOLUNTARY, Fee.CalcMethod.FIXED, f2Price);         
        Fee f3 = createFee(f3Name, Fee.FeeType.COMPULSORY, Fee.CalcMethod.CONSUMPTION, f3Price); 
        Fee f4 = createFee(f4Name, Fee.FeeType.VOLUNTARY, Fee.CalcMethod.FIXED, f4Price);      
        Fee f5 = createFee(f5Name, Fee.FeeType.COMPULSORY, Fee.CalcMethod.PER_MEMBER, f5Price); 
        Fee f6 = createFee(f6Name, Fee.FeeType.VOLUNTARY, Fee.CalcMethod.FIXED, f6Price); 

        // Tạo 5 hộ gia đình mẫu của chung cư BlueMoon với số xe đăng ký sẵn
        Household h1 = createHousehold("P101", "Nguyen Van Hung", 4, 75.0, 2, 1);  
        Household h2 = createHousehold("P102", "Tran Thi Tuyet", 2, 60.0, 1, 0);   
        Household h3 = createHousehold("P201", "Pham Minh Tuấn", 5, 110.0, 3, 1);  
        Household h4 = createHousehold("P202", "Le Hoang Nam", 3, 85.0, 2, 1);     
        Household h5 = createHousehold("P301", "Hoang Đức Long", 1, 45.0, 0, 0);   

        // Chọn danh sách phí áp dụng cho đợt mẫu
        List<String> sampleFeeIds = new ArrayList<>();
        sampleFeeIds.add(f1.getId());
        sampleFeeIds.add(f2.getId());
        sampleFeeIds.add(f3.getId());
        sampleFeeIds.add(f4.getId());
        sampleFeeIds.add(f5.getId());
        sampleFeeIds.add(f6.getId());

        // Tạo đợt thu tháng 5 (Các khoản bắt buộc và phí gửi xe đăng ký sẽ tự động gán ở đây!)
        CollectionPeriod samplePeriod = createPeriod("Đợt thu phí tháng 05/2026", sampleFeeIds);

        // Chỉ cần cập nhật thêm chỉ số tiêu dùng (nước) đo đạc thực tế và đăng ký quỹ tự nguyện
        // Hộ P101 (dùng 18 khối nước, ủng hộ 1 suất từ thiện)
        assignFeeToHousehold("P101", samplePeriod.getId(), f3.getId(), 18); 
        assignFeeToHousehold("P101", samplePeriod.getId(), f4.getId(), 1); 

        // Hộ P102 (dùng 8 khối nước)
        assignFeeToHousehold("P102", samplePeriod.getId(), f3.getId(), 8);  
        // Đã thanh toán trước phí dịch vụ và phí an ninh của P102
        for (AssignedFee af : assignedFees) {
            if (af.getHouseholdId().equals("P102") && af.getPeriodId().equals(samplePeriod.getId())) {
                if (af.getFeeId().equals(f1.getId()) || af.getFeeId().equals(f5.getId())) {
                    af.setStatus(AssignedFee.PaymentStatus.PAID);
                    af.setPaidAt(LocalDateTime.now());
                }
            }
        }

        // Hộ P201 (dùng 25 khối nước, ủng hộ 2 suất từ thiện)
        assignFeeToHousehold("P201", samplePeriod.getId(), f3.getId(), 25); 
        assignFeeToHousehold("P201", samplePeriod.getId(), f4.getId(), 2); 

        // Hộ P202 (dùng 12 khối nước)
        assignFeeToHousehold("P202", samplePeriod.getId(), f3.getId(), 12); 

        // Hộ P301 (dùng 5 khối nước)
        assignFeeToHousehold("P301", samplePeriod.getId(), f3.getId(), 5);  
    }
}
