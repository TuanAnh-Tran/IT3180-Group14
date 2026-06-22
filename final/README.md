# Hướng dẫn khởi chạy ứng dụng Quản lý Chung cư (Apartment Management System)

Dự án này là một ứng dụng Fullstack bao gồm Frontend tĩnh và Backend Spring Boot. Dưới đây là hướng dẫn chi tiết để bạn có thể mở web, khởi chạy và demo chạy thử các tính năng.

## 📁 Cấu trúc thư mục mã nguồn
```
.
├── frontend/           # Giao diện tĩnh HTML, CSS, JS
├── backend/            # REST API Spring Boot (Java Maven)
├── docker-compose.yml  # File cấu hình khởi chạy Docker Compose
└── README.md           # Hướng dẫn này
```

## 🛠️ Yêu cầu hệ thống
- Đã cài đặt **Docker** và **Docker Compose** (Khuyên dùng Docker Desktop để chạy dễ nhất).
- Cổng `80` (cho frontend) và `8080` (cho backend) phải trống trên máy của bạn.

---

## 🚀 Cách chạy hệ thống tự động bằng Docker (Cách dễ nhất để demo)

Chỉ cần chạy một câu lệnh duy nhất từ thư mục gốc của dự án để khởi động toàn bộ ứng dụng (bao gồm Cơ sở dữ liệu MySQL, Spring Boot Backend và Nginx Frontend):

1. Mở terminal (PowerShell, Command Prompt, hoặc Terminal trong VSCode) tại thư mục gốc của dự án.
2. Khởi chạy lệnh sau:
   ```bash
   docker compose up --build
   ```
3. Đợi vài phút để Docker tải image và khởi động. Sau khi thấy thông báo "Started ApartmentApplication in ... seconds", hệ thống đã sẵn sàng:
   - **🌐 Frontend (Giao diện người dùng):** Truy cập `http://localhost`
   - **📄 Backend Swagger UI:** Truy cập `http://localhost:8080/swagger-ui/index.html`

4. Để dừng hệ thống, nhấn `Ctrl + C` trên terminal đang chạy, hoặc gõ lệnh:
   ```bash
   docker compose down
   ```

---

## 🎯 Hướng dẫn Test / Demo các tính năng nổi bật

### 1. Khởi tạo tài khoản Admin đầu tiên (Bảo mật Admin)
Hệ thống sử dụng cơ chế bảo mật cho phép tạo tài khoản Admin mà không cần can thiệp database:
- Mở web ở `http://localhost`, chọn tab **Đăng ký**.
- Điền các thông tin cá nhân bắt buộc (Tên đăng nhập, Email, ...).
- Ở mục **Admin Secret**, điền mã bí mật: `AdminSecureKey2024!`
- Nhấn đăng ký. Hệ thống sẽ tự động cấp quyền **Admin** và trạng thái **APPROVED** cho tài khoản này. Bạn có thể đăng nhập ngay lập tức.

### 2. Quên / Reset Mật Khẩu (Giả lập gửi Email)
Để test luồng cấp lại mật khẩu (OTP):
- Tại màn hình Đăng nhập, bấm **Forgot Password?**.
- Nhập Email đã đăng ký và bấm Gửi OTP.
- Mở cửa sổ Terminal (nơi bạn đang chạy Docker backend hoặc IDE), bạn sẽ thấy log in ra đoạn email giả lập chứa mã **OTP 6 số**:
  ```
  =========================================================
  MOCK EMAIL SENT TO: <email của bạn>
  SUBJECT: Password Reset OTP
  BODY: Your OTP code is: 123456. It expires in 5 minutes.
  =========================================================
  ```
- Lấy mã số này, quay lại màn hình web nhập OTP và mật khẩu mới để đổi mật khẩu.

### 3. Tính năng Khóa tài khoản do nhập sai mật khẩu (Lockout)
- Hãy đăng xuất và cố tình **nhập sai mật khẩu 5 lần** đối với 1 tài khoản thông thường.
- Ở lần thứ 5, tài khoản đó sẽ bị chuyển sang trạng thái **LOCKED** (Bị khóa).
- Để mở khóa: Đăng nhập bằng tài khoản **Admin**, vào tab "System Accounts Registry". Bạn sẽ thấy chữ "LOCKED" màu đỏ bên cạnh tài khoản. Nhấn vào biểu tượng **Mở Khóa (màu xanh lá)** ở cột Actions để cấp lại quyền truy cập.

---

## 💻 Cách chạy thủ công từng phần (Dành cho Lập trình viên)

### 1. Khởi chạy Cơ sở dữ liệu (MySQL)
Bạn có thể tự chạy MySQL cục bộ trên máy của mình (Cổng 3306) và cấu hình trong file `application.properties`. Khi Backend chạy, tự động database sẽ được tạo bảng.

### 2. Khởi chạy Backend Java Spring Boot
1. Chuyển vào thư mục `backend/`.
2. Mở tệp `src/main/resources/application.properties` và cập nhật thông tin MySQL (username, password) của bạn.
3. Chạy ứng dụng từ IDE của bạn (IntelliJ IDEA / Eclipse) bằng cách chạy class `ApartmentApplication.java`. Hoặc dùng Maven nếu có sẵn.

### 3. Khởi chạy Giao diện Frontend
Sử dụng extension như **Live Server** trong VS Code để mở thư mục `frontend/` (sẽ chạy ở port `5500`). Hoặc có thể mở file `frontend/index.html` trực tiếp trên trình duyệt.
