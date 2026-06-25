# Hướng dẫn chạy và sử dụng dự án - IT3180-Group14

Dự án này là hệ thống quản lý cư dân và thu phí chung cư (Cyberspace Portal & SmartFee). Hệ thống bao gồm Frontend (HTML/CSS/JS thuần) kết nối với Backend Spring Boot (REST API + MySQL) cùng cơ chế tự động chuyển vùng dữ liệu (Fallback Mode về LocalStorage) nếu không kết nối được backend.

---

## 🛠️ Hướng dẫn Setup & Khởi chạy dự án

Bạn có hai cách để chạy dự án: **Chạy qua Docker (Khuyên dùng)** hoặc **Chạy thủ công từng phần**.

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên dùng)
Yêu cầu: Máy đã cài sẵn Docker và Docker Compose.

1. Mở Terminal tại thư mục gốc của dự án (`/c/cnpm`).
2. Chạy lệnh sau để khởi động cả Database MySQL và Backend Spring Boot:
   ```bash
   docker-compose up -d --build
   ```
3. Docker sẽ tự động:
   - Tải image MySQL 8.0, tạo cơ sở dữ liệu `apartment_db`.
   - Biên dịch và chạy container Backend Spring Boot trên cổng `8080`.
4. Để tắt hệ thống, chạy lệnh:
   ```bash
   docker-compose down
   ```

---

### Cách 2: Khởi chạy thủ công từng phần

#### 1. Khởi chạy Database (MySQL)
- Tạo một database trong MySQL local của bạn với tên: `apartment_db`.
- Mở file [application.properties](file:///c:/cnpm/backend/src/main/resources/application.properties) và điều chỉnh mật khẩu kết nối database:
  ```properties
  spring.datasource.password=your_password_here
  ```

#### 2. Khởi chạy Backend (Java Spring Boot)
Yêu cầu: Java SDK 17 và Maven đã được cài đặt.

- Di chuyển vào thư mục backend:
  ```bash
  cd backend
  ```
- Biên dịch dự án:
  ```bash
  mvn clean compile
  ```
- Chạy dự án:
  ```bash
  mvn spring-boot:run
  ```
- Backend sẽ hoạt động tại địa chỉ: `http://localhost:8080`.

#### 3. Khởi chạy Frontend (HTML/CSS/JS)
- Bạn chỉ cần mở trực tiếp file [index.html](file:///c:/cnpm/03-SourceCodes/frontend/index.html) bằng trình duyệt web.
- **Khuyên dùng**: Mở bằng extension **Live Server** trên VS Code để tối ưu hóa việc tải dữ liệu và reload tự động khi sửa code.

---

## 🔑 Tài khoản đăng nhập Demo

Khi khởi chạy thành công, hệ thống đã nạp sẵn dữ liệu thử nghiệm (Seed data). Bạn có thể đăng nhập bằng các tài khoản sau:

| Tên đăng nhập | Mật khẩu | Vai trò | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **admin** | admin123 | **Admin** (Quản trị viên) | Toàn quyền quản lý cư dân, tạo tài khoản, tạo đợt thu phí, gán phí, duyệt thanh toán. |
| **accountant** | accountant123 | **Accountant** (Kế toán) | Duyệt thanh toán hóa đơn, xem biểu đồ thống kê, xuất báo cáo doanh thu. |
| **resident1** | user123 | **Resident** (Cư dân) | Chỉ xem được thông tin hộ gia đình, nhân khẩu của mình, xem hóa đơn chưa đóng và lịch sử đóng phí. |

---

## 📁 Cấu trúc thư mục mã nguồn chính (5 bậc chi tiết)

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

---

## 💡 Các tính năng nổi bật & Lưu ý quan trọng cho nhóm

1. **Chế độ tự động Fallback**: 
   - Khi mở Frontend, hệ thống sẽ tự động gửi một request kiểm tra kết nối tới Backend.
   - Nếu Backend đang chạy (`Connected`), hệ thống sẽ chuyển sang chế độ **Fullstack Mode** (lưu trữ MySQL thông qua REST API).
   - Nếu Backend tắt (`Offline`), hệ thống sẽ chuyển sang **Fallback Mode** (lưu trữ mock trực tiếp trên trình duyệt qua LocalStorage) để các thành viên vẫn có thể demo/kiểm thử frontend bình thường.
2. **Quy định validation**:
   - Số điện thoại cư dân/hộ dân khi thêm mới bắt buộc phải bắt đầu bằng chữ số `0` và có đúng 10 ký tự số.
   - Căn cước công dân (CCCD / CMND) bắt buộc phải có đúng 12 ký tự số.
3. **Phân quyền người dùng**:
   - Khi sửa code, hãy chắc chắn kiểm tra biến `currentUser.role` trước khi hiển thị các tác vụ chỉnh sửa (nút Edit, Delete, Save) để tránh lỗi logic cư dân thao tác được tính năng của admin.
