# Hướng dẫn khởi chạy ứng dụng Cyberspace Portal (Fullstack)

Dự án đã được chuyển đổi sang kiến trúc Fullstack và tổ chức lại cấu trúc mã nguồn một cách rõ ràng trong thư mục `03-SourceCodes`.

## Cấu trúc thư mục mã nguồn
```
03-SourceCodes/
├── frontend/           # Giao diện tĩnh HTML, CSS, JS
├── backend/            # REST API Spring Boot (Java Maven)
├── docker-compose.yml  # File cấu hình khởi chạy Docker Compose
└── README.md           # Hướng dẫn này
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
