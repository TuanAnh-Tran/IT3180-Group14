package com.fee.system.models;

/**
 * LỚP ĐỐI TƯỢNG KHOẢN THU (FEE MODEL)
 * Đại diện cho một danh mục khoản thu trong hệ thống (VD: Phí gửi xe, Tiền nước,...)
 */
public class Fee {
    
    /**
     * Enum định nghĩa Tính chất của Khoản Thu:
     * - COMPULSORY: Bắt buộc đóng (Hệ thống sẽ tự động gán cho toàn bộ hộ dân khi tạo đợt thu).
     * - VOLUNTARY: Tự nguyện đóng (Cần hộ dân đăng ký hoặc gán thủ công).
     */
    public enum FeeType {
        COMPULSORY, // Khoản thu bắt buộc
        VOLUNTARY   // Khoản thu tự nguyện
    }

    /**
     * Enum định nghĩa Phương thức tính tiền của Khoản Thu:
     * - FIXED: Số tiền cố định, không phụ thuộc vào các chỉ số khác (VD: Ủng hộ từ thiện cố định 50,000đ).
     * - PER_MEMBER: Tính theo nhân khẩu (Số tiền = Đơn giá * Số người trong hộ).
     * - PER_AREA: Tính theo diện tích (Số tiền = Đơn giá * Số m2 căn hộ).
     * - CONSUMPTION: Tính theo chỉ số đo đạc thực tế (Số tiền = Đơn giá * Số điện/nước tiêu thụ thực tế).
     */
    public enum CalcMethod {
        FIXED,        // Tính cố định
        PER_MEMBER,   // Tính theo đầu người
        PER_AREA,     // Tính theo diện tích m²
        CONSUMPTION   // Tính theo lượng tiêu thụ thực tế
    }

    private String id;             // Mã khoản thu duy nhất (Sinh tự động)
    private String name;           // Tên khoản thu (VD: Phí vệ sinh)
    private FeeType type;          // Tính chất khoản thu (Bắt buộc / Tự nguyện)
    private CalcMethod calcMethod; // Phương thức tính toán tiền
    private double price;          // Đơn giá hoặc số tiền cố định

    /**
     * Phương thức khởi tạo một Khoản thu mới
     * @param id Mã khoản thu
     * @param name Tên khoản thu
     * @param type Tính chất
     * @param calcMethod Cách thức tính tiền
     * @param price Đơn giá / Số tiền
     */
    public Fee(String id, String name, FeeType type, CalcMethod calcMethod, double price) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.calcMethod = calcMethod;
        this.price = price;
    }

    // --- CÁC PHƯƠNG THỨC GETTER VÀ SETTER (ĐÓNG GÓI DỮ LIỆU) ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public FeeType getType() { return type; }
    public void setType(FeeType type) { this.type = type; }

    public CalcMethod getCalcMethod() { return calcMethod; }
    public void setCalcMethod(CalcMethod calcMethod) { this.calcMethod = calcMethod; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    /**
     * Chuyển thông tin đối tượng thành chuỗi String để in log khi cần thiết
     */
    @Override
    public String toString() {
        return "Fee{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", type=" + type +
                ", calcMethod=" + calcMethod +
                ", price=" + price +
                '}';
    }
}
