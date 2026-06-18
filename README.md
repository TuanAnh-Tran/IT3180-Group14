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

## 📁 Cấu trúc thư mục mã nguồn chính

```text
c:\cnpm
├── 03-SourceCodes
│   ├── frontend/             <-- Giao diện hệ thống
│   │   ├── index.html        <-- File entry point chính
│   │   ├── css/              <-- CSS styles & Variables
│   │   └── js/               <-- Logic ứng dụng
│   │       ├── app.js        <-- Điều phối đăng nhập, định tuyến & app shell
│   │       ├── auth.js       <-- Quản lý JWT/Session & đăng nhập
│   │       ├── api.js        <-- Client kết nối API Backend
│   │       └── components/   <-- Các module giao diện (dashboard, residents, fees, payment, profile, users)
├── backend/                  <-- Mã nguồn Spring Boot Java
│   ├── src/main/java/        <-- Controllers, Models, Services, DTOs, Repositories
│   └── src/main/resources/   <-- Cấu hình Spring Boot & Database schema script
└── docker-compose.yml        <-- File chạy nhanh toàn bộ dự án
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
