package com.fee.system.models;

/**
 * LỚP ĐỐI TƯỢNG HỘ GIA ĐÌNH / CĂN HỘ (HOUSEHOLD MODEL)
 * Lưu trữ các thông số cơ bản của hộ gia đình phục vụ làm căn cứ tính tiền các khoản phí.
 */
public class Household {
    private String id;          // Mã hộ gia đình hoặc số căn hộ duy nhất (VD: P101, CH302,...)
    private String ownerName;   // Họ tên người đại diện chủ hộ (VD: Nguyễn Văn A)
    private int membersCount;   // Số nhân khẩu thực tế (Sử dụng để nhân đơn giá trong phí tính theo đầu người)
    private double area;        // Diện tích căn hộ m² (Sử dụng để nhân đơn giá trong phí dịch vụ/diện tích)
    private int motorcycleCount; // Số xe máy đăng ký gửi của hộ dân
    private int carCount;        // Số xe ô tô đăng ký gửi của hộ dân

    /**
     * Khởi tạo thông tin một hộ dân
     * @param id Mã căn hộ
     * @param ownerName Tên chủ hộ
     * @param membersCount Số người
     * @param area Diện tích m2
     * @param motorcycleCount Số xe máy
     * @param carCount Số ô tô
     */
    public Household(String id, String ownerName, int membersCount, double area, int motorcycleCount, int carCount) {
        this.id = id;
        this.ownerName = ownerName;
        this.membersCount = membersCount;
        this.area = area;
        this.motorcycleCount = motorcycleCount;
        this.carCount = carCount;
    }

    // --- CÁC PHƯƠNG THỨC GETTER VÀ SETTER ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public int getMembersCount() { return membersCount; }
    public void setMembersCount(int membersCount) { this.membersCount = membersCount; }

    public double getArea() { return area; }
    public void setArea(double area) { this.area = area; }

    public int getMotorcycleCount() { return motorcycleCount; }
    public void setMotorcycleCount(int motorcycleCount) { this.motorcycleCount = motorcycleCount; }

    public int getCarCount() { return carCount; }
    public void setCarCount(int carCount) { this.carCount = carCount; }

    @Override
    public String toString() {
        return "Household{" +
                "id='" + id + '\'' +
                ", ownerName='" + ownerName + '\'' +
                ", membersCount=" + membersCount +
                ", area=" + area +
                ", motorcycleCount=" + motorcycleCount +
                ", carCount=" + carCount +
                '}';
    }
}
