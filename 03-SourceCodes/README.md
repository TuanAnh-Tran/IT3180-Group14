# Hướng dẫn khởi chạy ứng dụng Cyberspace Portal (Fullstack)

Dự án đã được chuyển đổi sang kiến trúc Fullstack và tổ chức lại cấu trúc mã nguồn một cách rõ ràng trong thư mục `03-SourceCodes`.

## Cấu trúc thư mục mã nguồn (5 bậc chi tiết)
```text
c:\cnpm (Bậc 1: tree)
├── 03-SourceCodes (Mã nguồn chính)
│   ├── frontend/ (Bậc 2: fe)
│   │   ├── index.html (Bậc 3: File entry point)
│   │   ├── css/
│   │   └── js/
│   │       ├── app.js (Bậc 3: Cấu hình chung, định tuyến)
│   │       └── components/ (Bậc 4: Bộ chức năng FE)
│   │           ├── residents.js (Bậc 4: Quản lý cư dân & hộ khẩu)
│   │           │   ├── [CRUD cư dân & hộ khẩu] (Bậc 5: Chi tiết chức năng)
│   │           │   ├── [Đăng ký tạm trú / tạm vắng] (Bậc 5)
│   │           │   └── [Lịch sử thay đổi nhân khẩu] (Bậc 5)
│   │           ├── fees.js (Bậc 4: Quản lý đợt thu & khoản phí)
│   │           │   ├── [Tự động tính phí theo diện tích/nhân khẩu/chỉ số tiêu thụ] (Bậc 5)
│   │           │   └── [Tạo đợt thu & cấu hình khoản phí] (Bậc 5)
│   │           ├── payment.js (Bậc 4: Thanh toán & Quản lý biên lai)
│   │           │   ├── [Quét mã QR / Nộp tiền mặt] (Bậc 5)
│   │           │   └── [Thanh toán từng phần & nộp thừa vào ví] (Bậc 5)
│   │           ├── dashboard.js (Bậc 4: Thống kê báo cáo trực quan)
│   │           │   ├── [Biểu đồ cột doanh thu & Cơ cấu khoản thu] (Bậc 5)
│   │           │   └── [Xuất báo cáo tài chính Excel] (Bậc 5)
│   │           ├── profile.js (Bậc 4: Hồ sơ cá nhân cư dân)
│   │           │   └── [Xem thông tin hộ gia đình & lịch sử đóng phí] (Bậc 5)
│   │           └── users.js (Bậc 4: Quản trị tài khoản)
│   │               ├── [Đăng nhập JWT Stateless & Phân quyền] (Bậc 5)
│   │               └── [Reset mật khẩu & xác thực OTP] (Bậc 5)
│   │
│   └── backend/ (Bậc 2: be)
│       └── src/main/java/com/cnpm/apartment/ (Bậc 3: File Java Backend)
│           ├── controller/ (Bậc 4: REST Controller endpoints)
│           │   ├── ResidentController.java (Bậc 5: API CRUD cư dân, tạm vắng)
│           │   ├── HouseholdController.java (Bậc 5: API quản lý hộ khẩu, ví tiền)
│           │   ├── FeeController.java (Bậc 5: API tạo đợt thu, khoản phí)
│           │   ├── ReceiptController.java (Bậc 5: API nộp phí, xuất Excel)
│           │   └── AuthController.java (Bậc 5: API xác thực, OTP)
│           ├── model/ (Bậc 4: ORM Entity & Database Schema)
│           │   ├── Resident.java & Household.java (Bậc 5: Ràng buộc DB nhân khẩu)
│           │   ├── Fee.java & AssignedFee.java (Bậc 5: Ràng buộc DB khoản thu)
│           │   └── Receipt.java (Bậc 5: Ràng buộc DB biên lai)
│           ├── repository/ (Bậc 4: JPA Data layer với Pessimistic Lock)
│           │   └── AssignedFeeRepository.java (Bậc 5: Lock hóa đơn tránh double-pay)
│           └── security/ (Bậc 4: Spring Security & JWT Filters)
│               └── JwtAuthFilter.java (Bậc 5: Kiểm tra token & Khóa brute force)
└── docker-compose.yml (File chạy nhanh toàn bộ dự án)
```

## Yêu cầu hệ thống
- Đã cài đặt **Docker** và **Docker Compose** (Khuyên dùng Docker Desktop).
- Cổng `80` (cho frontend) và `8080` (cho backend) phải trống trên máy của bạn.

---

## Cách chạy hệ thống bằng Docker Compose (Khuyên dùng)

Chỉ cần chạy một câu lệnh duy nhất từ thư mục `03-SourceCodes/` để khởi động toàn bộ ứng dụng (bao gồm Cơ sở dữ liệu MySQL, Spring Boot Backend và Nginx Frontend):

1. Mở terminal (PowerShell hoặc Command Prompt) tại thư mục `03-SourceCodes/`.
2. Khởi chạy lệnh:
   ```bash
   docker compose up --build
   ```
3. Sau khi tất cả các dịch vụ khởi động thành công:
   - **Frontend (Giao diện người dùng):** Truy cập `http://localhost` (Cổng 80)
   - **Backend (Swagger UI Tài liệu API):** Truy cập `http://localhost:8080/swagger-ui/index.html`
   - **Cơ sở dữ liệu (MySQL):** Hoạt động tại `localhost:3306`

4. Để dừng hệ thống:
   ```bash
   docker compose down
   ```

---

## Cách chạy thủ công từng phần (Dành cho Lập trình viên)

### 1. Khởi chạy Cơ sở dữ liệu (MySQL)
Bạn có thể tự chạy MySQL cục bộ trên máy của mình (Cổng 3306) và chạy lệnh trong file `backend/src/main/resources/schema.sql` để khởi tạo các bảng và chèn dữ liệu mẫu.

### 2. Khởi chạy Backend Java Spring Boot
1. Truy cập thư mục `03-SourceCodes/backend/`.
2. Mở tệp `src/main/resources/application.properties` và cập nhật thông tin kết nối MySQL (username, password) của bạn.
3. Chạy ứng dụng bằng cách gõ:
   ```bash
   ./mvnw spring-boot:run
   ```
   Hoặc chạy tệp `ApartmentApplication.java` từ IDE của bạn (IntelliJ IDEA / Eclipse).

### 3. Khởi chạy Giao diện Frontend
Mở tệp `03-SourceCodes/frontend/index.html` trực tiếp trên trình duyệt hoặc sử dụng extension như **Live Server** trong VS Code để chạy.
