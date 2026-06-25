# TÀI LIỆU KỊCH BẢN KIỂM THỬ CHI TIẾT (DETAILED TEST CASES) — BLUEMOON APARTMENT PORTAL
**Môn học:** Công Nghệ Phần Mềm — IT3180  
**Nhóm:** Group 14  
**Hệ thống:** BlueMoon Apartment Management System (Hệ thống Quản lý Thu phí Chung cư)  
**Kiến trúc:** REST API (Spring Boot) + MySQL + Frontend SPA  
**Phiên bản:** 2.0 (Bản nâng cấp chi tiết hóa từ v1.0, tích hợp DB thật & Spring Security)  

---

## 1. TỔNG QUAN HỆ THỐNG KIỂM THỬ

| Thành phần | Mô tả kỹ thuật |
| :--- | :--- |
| **Kiến trúc ứng dụng** | Full-stack RESTful API (Backend: Spring Boot 3.x; Frontend: Vanilla HTML/CSS/JS SPA) |
| **Cơ chế Xác thực (Auth)** | Spring Security + BCrypt (Mã hóa mật khẩu) + Stateless JWT (JSON Web Token) |
| **Lưu trữ dữ liệu** | Cơ sở dữ liệu quan hệ MySQL 8.x (Thay thế hoàn toàn LocalStorage giả lập ở v1.0) |
| **Phân quyền người dùng** | `ROLE_ADMIN` (Quản trị hệ thống/Ban quản lý), `ROLE_ACCOUNTANT` (Kế toán), `ROLE_USER` (Cư dân) |
| **Quy định mật khẩu** | Tối thiểu 6 ký tự, mã hóa BCrypt một chiều trước khi lưu DB |
| **Khóa tài khoản** | Tự động khóa tài khoản sau **5 lần** đăng nhập sai liên tiếp; tự động mở khóa sau **15 phút** hoặc được Admin mở khóa thủ công |
| **Trạng thái tài khoản cư dân** | Đăng ký mới cần Ban quản lý phê duyệt (`status = PENDING`) |

---

## 2. KỊCH BẢN KIỂM THỬ CHI TIẾT (82 TEST CASES)

### 2.1 TC-AUTH — Xác thực người dùng & Bảo mật hệ thống

#### **TC-AUTH-01: Đăng nhập thành công với tài khoản Admin**
* **Mức độ:** Critical
* **Điều kiện tiên quyết:** Tài khoản Admin (`admin` / `admin123`) tồn tại trong bảng `users` với `status = ACTIVE`.
* **Dữ liệu đầu vào (Input / Payload):**
  * HTTP Request: `POST /api/auth/login`
  * Body: `{"username": "admin", "password": "admin123"}`
* **Các bước thực hiện:**
  1. Từ màn hình đăng nhập, nhập Username `admin` và Password `admin123`.
  2. Click nút "Sign In".
* **Kết quả mong đợi:**
  * Backend trả về status `200 OK` kèm theo JWT Token và vai trò `ROLE_ADMIN`.
  * Frontend lưu token vào `sessionStorage` và giải mã thành công.
  * Chuyển hướng sang màn hình Dashboard của Admin.
  * Sidebar hiển thị đầy đủ: Dashboard, User Management, Residents, Fee Manager, Thanh Toán, My Profile.
  * Topbar hiển thị tên "System Administrator".

#### **TC-AUTH-02: Đăng nhập thành công với tài khoản Resident**
* **Mức độ:** Critical
* **Điều kiện tiên quyết:** Tài khoản Resident (`resident1` / `user123`) có sẵn trong bảng `users` (`status = ACTIVE`).
* **Dữ liệu đầu vào:**
  * HTTP Request: `POST /api/auth/login`
  * Body: `{"username": "resident1", "password": "user123"}`
* **Các bước thực hiện:**
  1. Nhập Username `resident1` và Password `user123`.
  2. Click nút "Sign In".
* **Kết quả mong đợi:**
  * Đăng nhập thành công, trả về JWT Token chứa vai trò `ROLE_USER`.
  * Chuyển hướng sang Dashboard của cư dân.
  * Sidebar **KHÔNG** hiển thị mục "User Management".
  * Topbar hiển thị tên cư dân liên kết (ví dụ: "Michael Scott").

#### **TC-AUTH-03: Đăng nhập với mật khẩu sai**
* **Mức độ:** High
* **Dữ liệu đầu vào:**
  * Body: `{"username": "admin", "password": "wrongpassword"}`
* **Các bước thực hiện:**
  1. Nhập Username `admin` và Password `wrongpassword`.
  2. Click "Sign In".
* **Kết quả mong đợi:**
  * Backend trả về status `401 Unauthorized` kèm thông báo lỗi: `"Incorrect username or password!"`.
  * Màn hình hiển thị toast message cảnh báo màu đỏ dạng: *"Incorrect username or password!"*
  * Không chuyển trang, nút đăng nhập được kích hoạt lại để nhập lại.

#### **TC-AUTH-04: Đăng nhập với tài khoản không tồn tại**
* **Mức độ:** High
* **Dữ liệu đầu vào:**
  * Body: `{"username": "unknownuser", "password": "anypassword"}`
* **Các bước thực hiện:**
  1. Nhập tên đăng nhập `unknownuser` không tồn tại trong DB.
  2. Nhập mật khẩu bất kỳ và nhấn "Sign In".
* **Kết quả mong đợi:**
  * API trả về lỗi `401 Unauthorized`.
  * Hiển thị toast: *"Incorrect username or password!"*
  * Ràng buộc bảo mật: Không được tiết lộ thông tin tài khoản có tồn tại hay không.

#### **TC-AUTH-05: Đăng nhập để trống các trường bắt buộc**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Để trống ô Username và Password.
  2. Nhấn nút "Sign In".
* **Kết quả mong đợi:**
  * Frontend thực hiện validate trước khi gửi request.
  * Hiển thị cảnh báo: *"Please fill in both username and password!"*
  * Không gửi API request lên server.

#### **TC-AUTH-06: Đăng ký tài khoản cư dân hợp lệ (Chờ duyệt)**
* **Mức độ:** Critical
* **Dữ liệu đầu vào:**
  * HTTP Request: `POST /api/auth/register`
  * Body: `{"username": "newresident", "fullName": "Nguyen Test User", "room": "Room 501 - Block C", "phone": "0901234567", "password": "pass123"}`
* **Các bước thực hiện:**
  1. Chuyển sang tab "Register".
  2. Nhập đầy đủ và chính xác thông tin trên form.
  3. Nhấn "Create Account".
* **Kết quả mong đợi:**
  * Backend trả về status `201 Created` thành công.
  * Bản ghi mới được thêm vào MySQL bảng `users` với `status = PENDING`, `role = ROLE_USER`.
  * Màn hình hiển thị thông báo: *"Registration successful! Please wait for Admin approval."*
  * Không tự động đăng nhập.

#### **TC-AUTH-07: Đăng ký với username đã tồn tại**
* **Mức độ:** High
* **Dữ liệu đầu vào:**
  * Body: `{"username": "admin", "fullName": "Admin Shadow", ...}`
* **Các bước thực hiện:**
  1. Tại màn hình Đăng ký, nhập Username là `admin` (trùng tài khoản admin có sẵn).
  2. Điền đầy đủ thông tin khác và nhấn "Create Account".
* **Kết quả mong đợi:**
  * Backend kiểm tra trùng lặp và trả về status `400 Bad Request` kèm thông điệp `"Username already exists!"`.
  * Giao diện hiển thị Toast lỗi: *"Username already exists!"*.

#### **TC-AUTH-08: Đăng ký với Username dưới 4 ký tự (Kiểm thử biên)**
* **Mức độ:** Medium
* **Dữ liệu đầu vào:** Username = `abc` (3 ký tự).
* **Các bước thực hiện:**
  1. Điền Username = `abc`, mật khẩu hợp lệ và các trường khác đầy đủ.
  2. Nhấn "Create Account".
* **Kết quả mong đợi:**
  * Hệ thống chặn ở Client hoặc Server trả về lỗi kiểm tra tính hợp lệ.
  * Toast hiển thị: *"Username must be at least 4 characters long!"*.

#### **TC-AUTH-09: Đăng ký với Mật khẩu dưới 6 ký tự (Kiểm thử biên)**
* **Mức độ:** Medium
* **Dữ liệu đầu vào:** Password = `12345` (5 ký tự).
* **Các bước thực hiện:**
  1. Nhập username hợp lệ, nhập Password = `12345`.
  2. Nhấn "Create Account".
* **Kết quả mong đợi:**
  * Hệ thống chặn và hiển thị thông báo: *"Password must be at least 6 characters long!"*.

#### **TC-AUTH-10: Đăng xuất hệ thống**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Đang ở trạng thái đăng nhập, click nút "Sign Out" trên sidebar.
  2. Hộp thoại xác nhận hiện ra, nhấn "OK".
* **Kết quả mong đợi:**
  * Frontend thực hiện xóa JWT Token khỏi `sessionStorage`.
  * Chuyển hướng ngay lập tức về trang đăng nhập `index.html`.
  * Thử nhấn nút Back trên trình duyệt không thể truy cập lại trang Dashboard.

#### **TC-AUTH-11: Tự động khóa tài khoản sau 5 lần đăng nhập sai liên tiếp**
* **Mức độ:** High
* **Điều kiện tiên quyết:** Tài khoản Resident (`resident1`) đang ở trạng thái `ACTIVE`.
* **Các bước thực hiện:**
  1. Nhập Username `resident1` và Password sai (`wrongpass1`). Nhấn "Sign In".
  2. Lặp lại bước trên thêm 4 lần nữa liên tiếp (tổng cộng 5 lần sai).
* **Kết quả mong đợi:**
  * Từ lần 1 đến lần 4: Server trả về `401 Unauthorized` kèm thông báo đăng nhập thất bại.
  * Ở lần thứ 5: API trả về lỗi kèm thông điệp tài khoản đã bị khóa: `"Account locked due to 5 consecutive failed login attempts!"`.
  * Trạng thái tài khoản trong bảng `users` được cập nhật thành `LOCKED` (hoặc `status = INACTIVE` kèm theo ghi nhận trường `lock_time`).
  * Mọi nỗ lực đăng nhập tiếp theo bằng mật khẩu đúng hoặc sai đều bị từ chối kèm thông báo tài khoản bị khóa.

#### **TC-AUTH-12: Mở khóa tài khoản đã bị khóa**
* **Mức độ:** High
* **Điều kiện tiên quyết:** Tài khoản Resident (`resident1`) đang bị khóa (`LOCKED`/`INACTIVE`) sau 5 lần đăng nhập sai.
* **Các bước thực hiện:**
  * **Kịch bản A (Tự động mở khóa theo thời gian):**
    1. Chờ 15 phút kể từ lúc tài khoản bị khóa.
    2. Đăng nhập lại với mật khẩu đúng `user123`.
  * **Kịch bản B (Admin mở khóa thủ công):**
    1. Đăng nhập tài khoản Admin, truy cập "User Management".
    2. Tìm tài khoản `resident1`, nhấn nút "Unlock Account" (hoặc chuyển trạng thái từ `LOCKED` sang `ACTIVE`).
    3. Đăng nhập lại tài khoản `resident1` với mật khẩu đúng `user123`.
* **Kết quả mong đợi:**
  * Cả hai kịch bản đều giúp tài khoản trở lại trạng thái `ACTIVE` thành công.
  * Người dùng đăng nhập thành công vào hệ thống, nhận JWT Token và truy cập được Dashboard.
  * Số lần đăng nhập sai (failed attempts count) được reset về 0.

---

### 2.2 TC-USER — Quản lý tài khoản (Chức năng của Admin)

#### **TC-USER-01: Admin xem danh sách tất cả tài khoản**
* **Mức độ:** High
* **Điều kiện tiên quyết:** Đăng nhập với quyền `ROLE_ADMIN`.
* **Các bước thực hiện:**
  1. Click chọn menu "User Management" trên sidebar.
* **Kết quả mong đợi:**
  * Frontend gửi request `GET /api/users` kèm JWT token ở Header.
  * Backend trả về danh sách tài khoản trong MySQL bảng `users`.
  * Giao diện render ra bảng dữ liệu chứa các cột thông tin chi tiết. Tài khoản đang đăng nhập hiển thị nhãn "(You)". Tài khoản Admin gốc hiển thị nhãn "Protected".

#### **TC-USER-02: Resident bị từ chối truy cập User Management (Kiểm thử phân quyền)**
* **Mức độ:** Critical (Bảo mật)
* **Điều kiện tiên quyết:** Đăng nhập với quyền cư dân (`ROLE_USER`).
* **Các bước thực hiện:**
  1. Kiểm tra sidebar (mục User Management không xuất hiện).
  2. Thử giả lập gọi API bằng DevTools hoặc gửi request trực tiếp đến `GET /api/users`.
* **Kết quả mong đợi:**
  * API trả về `403 Forbidden`.
  * Frontend hiển thị thông báo: *"Access Denied!"* hoặc không hiển thị bất kỳ dữ liệu nào.

#### **TC-USER-03: Admin tạo mới tài khoản Resident hợp lệ**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Username=`testnew`, Full Name=`Test New User`, Room=`Room 101`, Phone=`0911111111`, Password=`pass123`, Role=`Resident`, Status=`ACTIVE`.
* **Các bước thực hiện:**
  1. Admin truy cập User Management -> click "+ Add New Resident".
  2. Điền thông tin hợp lệ và nhấn "Create Account".
* **Kết quả mong đợi:**
  * Backend lưu vào DB MySQL với mật khẩu được mã hóa BCrypt.
  * Hiển thị toast: *"Created resident @testnew successfully!"*.
  * Hộp thoại đóng lại, dòng tài khoản mới xuất hiện trên bảng.

#### **TC-USER-04: Admin tạo tài khoản trùng Username**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Mở form tạo tài khoản, nhập Username = `resident1`.
  2. Điền đầy đủ thông tin khác và nhấn nút tạo.
* **Kết quả mong đợi:**
  * Backend trả về mã lỗi kiểm tra trùng lặp.
  * Toast hiển thị: *"Username already exists!"*, form giữ nguyên dữ liệu để sửa.

#### **TC-USER-05: Admin thay đổi quyền (Role) của người dùng**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Tìm tài khoản `resident2` trên danh sách.
  2. Đổi dropdown Role từ "Resident" sang "System Admin".
* **Kết quả mong đợi:**
  * Gửi request `PUT /api/users/resident2/role` với role mới.
  * Database cập nhật quyền thành công. Toast báo: *"Changed @resident2's role to Admin!"*.

#### **TC-USER-06: Admin không thể tự đổi Role của chính mình**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Admin tìm tài khoản của chính mình trên danh sách.
* **Kết quả mong đợi:**
  * Dropdown chọn Role tại dòng tài khoản của chính mình bị disable (hoặc thay thế bằng badge tĩnh). Không cho phép gửi request đổi role chính mình.

#### **TC-USER-07: Admin xóa tài khoản Resident**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Click icon delete (thùng rác) tại dòng của tài khoản `testnew`.
  2. Xác nhận "OK" trong popup xác nhận xóa.
* **Kết quả mong đợi:**
  * Backend nhận request `DELETE /api/users/testnew`. Xóa bản ghi trong MySQL bảng `users`.
  * Toast hiển thị: *"Deleted account @testnew successfully!"*. Tài khoản biến mất khỏi giao diện.

#### **TC-USER-08: Admin không thể xóa tài khoản Admin gốc (Protected)**
* **Mức độ:** Critical
* **Các bước thực hiện:**
  1. Tìm dòng tài khoản `admin` trong bảng User Management.
* **Kết quả mong đợi:**
  * Icon delete bị ẩn hoặc disable. Cố tình gửi request `DELETE /api/users/admin` sẽ bị backend chặn và trả về lỗi `400 Bad Request`.

#### **TC-USER-09: Tìm kiếm tài khoản trong User Management**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Nhập từ khóa `"michael"` vào ô Tìm kiếm tài khoản.
* **Kết quả mong đợi:**
  * Bảng danh sách lập tức lọc chỉ hiển thị các tài khoản có tên hoặc username chứa chuỗi `"michael"` (chữ hoa/chữ thường không phân biệt).

#### **TC-USER-10: Lọc tài khoản theo vai trò (Role)**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Chọn dropdown Filter Role = "System Admin".
* **Kết quả mong đợi:**
  * Bảng danh sách cập nhật chỉ hiển thị những tài khoản có vai trò Admin.

---

### 2.3 TC-RES — Quản lý cư dân & hộ khẩu

#### **TC-RES-01: Xem danh sách hộ khẩu**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Nhấn vào mục "Resident Manager" trên sidebar.
  2. Xem tab "Households / Apartments".
* **Kết quả mong đợi:**
  * API `GET /api/households` trả về danh sách các hộ gia đình từ MySQL.
  * Hiển thị bảng danh sách hộ khẩu với các thông tin: Mã hộ, số căn hộ, diện tích, chủ hộ, số nhân khẩu, trạng thái.

#### **TC-RES-02: Thêm hộ khẩu mới hợp lệ**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Household code: `HH-C0501`, Apartment number: `C0501`, Floor: `5`, Area: `80`, Household head: `Vo Van Minh`, Phone: `0932111222`, Status: `Occupied`.
* **Các bước thực hiện:**
  1. Điền đầy đủ thông tin vào form thêm hộ khẩu.
  2. Nhấn nút "Save household".
* **Kết quả mong đợi:**
  * Gửi request `POST /api/households`. Lưu thành công vào bảng `households`.
  * Toast hiển thị: *"Household added"*. Hộ mới hiển thị trên bảng. Số liệu thống kê tăng 1.

#### **TC-RES-03: Thêm hộ khẩu trùng số phòng (Apartment Number)**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Apartment number = `A1201` (đã có trong DB).
* **Các bước thực hiện:**
  1. Điền thông tin hộ khẩu mới với Apartment number là `A1201`.
  2. Nhấn "Save household".
* **Kết quả mong đợi:**
  * Backend kiểm tra trùng lặp khóa duy nhất (Unique constraint) và trả về lỗi.
  * Toast báo lỗi: *"Apartment number already exists"*.

#### **TC-RES-04: Thêm hộ khẩu thiếu các trường bắt buộc**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Để trống trường "Household head".
  2. Nhấn "Save household".
* **Kết quả mong đợi:**
  * Giao diện chặn lại và thông báo lỗi: *"Please fill in required fields"*.

#### **TC-RES-05: Chỉnh sửa thông tin hộ khẩu**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Chọn hộ `HH-A1201` trong bảng, nhấn nút "Edit".
  2. Đổi Số điện thoại chủ hộ thành `0901111111`.
  3. Nhấn "Save household".
* **Kết quả mong đợi:**
  * Backend xử lý `PUT /api/households/HH-A1201`. Cập nhật trường phone trong database.
  * Hiển thị toast: *"Household updated"*. Số điện thoại mới hiển thị trên danh sách.

#### **TC-RES-06: Xóa hộ khẩu**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Nhấn nút "Delete" ở dòng hộ khẩu test mới tạo.
  2. Xác nhận xóa trong hộp thoại confirmation.
* **Kết quả mong đợi:**
  * Gửi request `DELETE /api/households/{id}`. Xóa bản ghi trong MySQL.
  * Các thành viên (residents) thuộc hộ khẩu đó tự động chuyển trạng thái liên kết hộ về null (hoặc bị hủy liên kết).
  * Toast hiển thị: *"Household deleted"*.

#### **TC-RES-07: Thêm cư dân mới hợp lệ**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Full name: `Bui Thi Thu`, Gender: `Female`, DOB: `1995-03-20`, Citizen ID: `036095001234`, Phone: `0944333222`, Hometown: `Ho Chi Minh City`, Occupation: `Doctor`, Status: `Permanent resident`, Household: Chọn `HH-A1201`.
* **Các bước thực hiện:**
  1. Chọn tab "Residents" trong Resident Manager.
  2. Điền form thông tin cư dân và chọn hộ khẩu liên kết.
  3. Nhấp "Save resident".
* **Kết quả mong đợi:**
  * Bản ghi lưu vào bảng `residents` trong MySQL.
  * Toast hiển thị: *"Resident added"*. Cư dân mới hiển thị trong bảng.

#### **TC-RES-08: Thêm cư dân trùng số Căn cước công dân (Citizen ID)**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Citizen ID = `001085000111` (đã tồn tại).
* **Các bước thực hiện:**
  1. Điền thông tin cư dân mới với Citizen ID trùng lặp.
  2. Nhấp "Save resident".
* **Kết quả mong đợi:**
  * Backend kiểm tra trùng lặp Citizen ID và trả về lỗi `400 Bad Request`.
  * Hiển thị toast báo lỗi: *"Citizen ID already exists"*.

#### **TC-RES-09: Gán cư dân vào hộ khẩu (Quản lý thành viên)**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Tại tab Households, click chọn "Members" của một hộ bất kỳ.
  2. Chọn cư dân tự do từ dropdown list và nhấn "Add to household".
* **Kết quả mong đợi:**
  * Database cập nhật trường `household_id` của cư dân đó sang hộ đã chọn.
  * Cư dân hiển thị trong danh sách thành viên hộ, số nhân khẩu của hộ tự động tăng lên.

#### **TC-RES-10: Tìm kiếm cư dân và hộ khẩu**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Chuyển sang tab "Search".
  2. Nhập từ khóa tìm kiếm: `"Nguyen Van An"`. Chọn loại tìm kiếm là "Residents".
* **Kết quả mong đợi:**
  * Hiển thị chính xác bản ghi cư dân "Nguyen Van An" cùng thông tin phòng ở.

#### **TC-RES-11: Reset dữ liệu mẫu (Tính năng Reset)**
* **Mức độ:** Low
* **Các bước thực hiện:**
  1. Click nút "Reset sample data" trong màn hình Resident Manager.
  2. Xác nhận đồng ý.
* **Kết quả mong đợi:**
  * Gửi request reset đến backend.
  * Database MySQL xóa các bản ghi tự tạo và ghi lại dữ liệu seed mặc định. Toast hiển thị thành công.

---

### 2.4 TC-FEE — Quản lý khoản thu & phân bổ phí (Fee Manager)

#### **TC-FEE-01: Xem tổng quan bảng điều khiển Fee Manager**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Click "Fee Manager" trên sidebar.
* **Kết quả mong đợi:**
  * Tải dữ liệu các chỉ số tài chính từ API: Tổng phải thu, Tổng đã thu, Tổng nợ, Tỷ lệ hoàn thành.
  * Hiển thị đúng số liệu thống kê thực tế tính toán từ cơ sở dữ liệu.

#### **TC-FEE-02: Xem danh sách các khoản thu phí**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Chọn tab "Khoản Thu" trên giao diện Fee Manager.
* **Kết quả mong đợi:**
  * API `GET /api/fees` trả về danh sách các loại phí dịch vụ.
  * Bảng hiển thị thông tin: Mã khoản thu, Tên khoản thu, Loại phí (Bắt buộc/Tự nguyện), Cách tính, Đơn giá.

#### **TC-FEE-03: Tạo mới khoản thu phí hợp lệ**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Tên: `Phí thang máy`, Loại: `COMPULSORY`, Cách tính: `PER_MEMBER` (theo nhân khẩu), Đơn giá: `15000`.
* **Các bước thực hiện:**
  1. Nhấn nút "+ Tạo Khoản Thu Mới".
  2. Nhập đầy đủ thông tin hợp lệ vào form.
  3. Nhấn "Lưu Khoản Thu".
* **Kết quả mong đợi:**
  * Gửi request `POST /api/fees`. Thêm mới thành công vào bảng `fees`.
  * Toast hiển thị thành công, khoản thu mới xuất hiện trên bảng.

#### **TC-FEE-04: Tạo khoản thu để trống Tên khoản thu (Kiểm thử biên)**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Mở form tạo khoản thu, điền đơn giá nhưng để trống ô Tên khoản thu.
  2. Nhấn "Lưu Khoản Thu".
* **Kết quả mong đợi:**
  * Giao diện cảnh báo trường bắt buộc hoặc backend trả về lỗi validate. Không lưu được bản ghi rỗng.

#### **TC-FEE-05: Chỉnh sửa thông tin khoản thu**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Tại khoản thu "Phí gửi xe máy", chọn nút "Sửa".
  2. Đổi đơn giá từ `70000` thành `80000`.
  3. Nhấp "Lưu Khoản Thu".
* **Kết quả mong đợi:**
  * Gửi request `PUT /api/fees/{id}`. Cập nhật đơn giá mới vào database.
  * Các hóa đơn chưa thanh toán liên quan đến phí này được cập nhật tính toán lại tự động.

#### **TC-FEE-06: Xóa khoản thu**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Chọn một khoản thu kiểm thử vừa tạo, nhấn "Xóa".
  2. Xác nhận xóa.
* **Kết quả mong đợi:**
  * Backend xử lý `DELETE /api/fees/{id}`. Xóa bản ghi phí.
  * Nếu phí đã được gán vào hóa đơn, backend trả về lỗi ràng buộc khóa ngoại (Foreign key constraint) hoặc xử lý cascade tùy cấu hình thiết kế (trả về thông báo lỗi chi tiết cho admin).

#### **TC-FEE-07: Tạo đợt thu mới và tự động gán phí bắt buộc**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Tên đợt thu: `Đợt thu phí tháng 06/2026`, Chọn các phí bắt buộc đính kèm.
* **Các bước thực hiện:**
  1. Vào Tab "Đợt Thu".
  2. Nhập thông tin tên đợt thu mới, chọn các khoản phí dịch vụ bắt buộc.
  3. Nhấn "Tạo & gán tự động khoản bắt buộc".
* **Kết quả mong đợi:**
  * Bản ghi đợt thu mới lưu vào MySQL ở trạng thái `ACTIVE`.
  * Backend tự động tạo hóa đơn (`assigned_fees`) cho tất cả hộ gia đình hiện có trong hệ thống đối với các khoản phí bắt buộc đã chọn.

#### **TC-FEE-08: Đóng đợt thu phí**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Tại danh sách đợt thu, chọn đợt thu đang hoạt động, nhấn "Đóng đợt".
* **Kết quả mong đợi:**
  * Trạng thái đợt thu chuyển sang `CLOSED`.
  * Sau khi đóng đợt, hệ thống chặn mọi thao tác tự động gán hoặc chỉnh sửa hóa đơn thuộc đợt này.

#### **TC-FEE-09: Thêm hộ dân vào phân bổ phí**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Vào Tab "Hộ Dân & Hóa Đơn", nhấn "+ Thêm Hộ Dân".
  2. Điền thông tin tài chính: Số xe máy, ô tô, diện tích căn hộ, số nhân khẩu. Nhấn "Thêm".
* **Kết quả mong đợi:**
  * Hộ dân được lưu vào phân hệ tính phí.
  * Hệ thống tự động gán các khoản phí bắt buộc từ đợt thu `ACTIVE` cho hộ dân này.

#### **TC-FEE-10: Thêm hộ dân trùng mã hộ trong phân hệ phí**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Mở form thêm hộ dân, nhập mã hộ `P101` (đã có trong DB).
  2. Nhấn "Thêm".
* **Kết quả mong đợi:**
  * Toast hiển thị cảnh báo: *"Mã hộ 'P101' đã tồn tại!"*. Hệ thống chặn không lưu dữ liệu.

#### **TC-FEE-11: Xem hóa đơn chi tiết của từng hộ dân**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Tại danh sách Hộ Dân & Hóa Đơn, nhấn "Xem hóa đơn" tại hộ `P101`.
* **Kết quả mong đợi:**
  * Modal chi tiết hóa đơn hiện lên. Hiển thị danh sách đầy đủ tất cả các khoản phí của hộ trong kỳ được chọn.
  * Hiển thị tổng số tiền cần đóng, số tiền đã đóng, số tiền còn nợ.

#### **TC-FEE-12: Kiểm tra tính toán công thức theo diện tích (PER_AREA / PER_M2)**
* **Mức độ:** Critical (Tính toán)
* **Dữ liệu kiểm thử:** Hộ HH003 (phòng P201, diện tích = 50.0 m²), Phí dịch vụ chung cư (FEE001) đơn giá = `15000đ/m²`.
* **Kết quả mong đợi:**
  * Thành tiền = `50 * 15000` = **`750.000đ`**.

#### **TC-FEE-13: Kiểm tra tính toán công thức theo nhân khẩu (PER_MEMBER / PER_PERSON)**
* **Mức độ:** Critical (Tính toán)
* **Dữ liệu kiểm thử:** Hộ HH001 (phòng P101, số nhân khẩu = 3), Phí vệ sinh (FEE002) đơn giá = `72000đ/người`.
* **Kết quả mong đợi:**
  * Thành tiền = `3 * 72000` = **`216.000đ`**.

#### **TC-FEE-14: Kiểm tra tự động gán phí xe máy/ô tô theo số lượng xe đăng ký**
* **Mức độ:** High
* **Dữ liệu kiểm thử:** Hộ HH002 (phòng P102, 2 xe máy, 1 ô tô), Hộ HH004 (phòng P202, 0 xe máy, 1 ô tô).
* **Kết quả mong đợi:**
  * Hộ HH002 tự động nhận phí gửi xe máy với số lượng = 2 (FEE003, đơn giá 70.000đ), xe ô tô với số lượng = 1 (FEE004, đơn giá 150.000đ).
  * Hộ HH004 tự động nhận phí gửi xe ô tô với số lượng = 1, không nhận phí gửi xe máy.

#### **TC-FEE-15: Kiểm tra tính toán công thức theo chỉ số tiêu dùng (CONSUMPTION) đối với Phí nước (chứa từ khóa "water")**
* **Mức độ:** Critical
* **Điều kiện tiên quyết:** Phí nước sinh hoạt (FEE005) có cách tính `CONSUMPTION` và đơn giá `10000đ/m³`. Có ghi nhận chỉ số điện nước (`UtilityRecord`) cho hộ HH001 trong kỳ hiện tại: `oldIndex = 120` và `newIndex = 135`.
* **Các bước thực hiện:**
  1. Admin/Kế toán tạo đợt thu phí hoặc gán tự động phí cho hộ HH001.
  2. Hệ thống thực hiện tính toán số tiền của phí nước sinh hoạt (FEE005).
* **Kết quả mong đợi:**
  * Hệ thống tự động nhận diện từ khóa `"water"` trong tên phí để quy định cách tính.
  * Số lượng tiêu dùng (quantity) được tính là: `newIndex - oldIndex` = `135 - 120` = `15` m³.
  * Số tiền phải nộp = `15 * 10000` = **`150.000đ`**.

#### **TC-FEE-16: Kiểm tra tính toán công thức theo chỉ số tiêu dùng (CONSUMPTION) đối với Phí điện (không chứa từ khóa "water")**
* **Mức độ:** Critical
* **Điều kiện tiên quyết:** Phí điện tiêu dùng (FEE006) có cách tính `CONSUMPTION` và đơn giá `2500đ/kWh`. Ghi nhận chỉ số điện nước cho hộ HH001: `oldIndex = 1240` và `newIndex = 1450`.
* **Các bước thực hiện:**
  1. Hệ thống tính toán hóa đơn phí điện cho hộ HH001 trong kỳ hiện tại.
* **Kết quả mong đợi:**
  * Hệ thống tự động áp dụng công thức tiêu dùng điện (không chứa từ khóa `"water"` nên mặc định là điện).
  * Lượng điện tiêu thụ = `1450 - 1240` = `210` kWh.
  * Số tiền phải nộp = `210 * 2500` = **`525.000đ`**.

#### **TC-FEE-17: Tự động quét và cộng dồn các khoản nợ cũ chưa thanh toán thành mã phí `FEE_DEBT` khi tạo đợt thu mới**
* **Mức độ:** High
* **Điều kiện tiên quyết:** Hộ HH001 còn nợ phí vệ sinh (`150.000đ` - trạng thái `UNPAID`) và phí gửi xe máy (`70.000đ` - trạng thái `PARTIAL` với nợ cũ còn `50.000đ`) ở đợt thu cũ đã đóng.
* **Các bước thực hiện:**
  1. Kế toán tiến hành tạo một đợt thu phí mới (`CollectionPeriod` mới).
  2. Xem danh sách các khoản phí được gán tự động cho hộ HH001 ở đợt thu mới.
* **Kết quả mong đợi:**
  * Hệ thống quét toàn bộ các khoản nợ chưa hoàn thành của đợt cũ.
  * Tổng nợ cũ tích lũy được tính: `150.000 + 50.000` = `200.000đ`.
  * Hộ HH001 tự động nhận một khoản phí đặc biệt có mã `FEE_DEBT` (Nợ cũ) với trường `quantity = 200000` và `amountRequired = 200000`.
  * Trạng thái của khoản phí `FEE_DEBT` được đặt là `UNPAID`.

---

### 2.5 TC-PAY — Ghi nhận thanh toán & Quản lý biên lai

#### **TC-PAY-01: Ghi nhận thanh toán thành công (Thanh toán toàn bộ)**
* **Mức độ:** Critical
* **Điều kiện tiên quyết:** Có hóa đơn ở trạng thái `UNPAID`.
* **Các bước thực hiện:**
  1. Vào menu "Thanh Toán & TK" -> tab "Thanh Toán".
  2. Chọn hóa đơn chưa nộp của hộ `P102`, nhấn "Đóng tiền".
  3. Để nguyên số tiền mặc định (bằng số tiền cần nộp), nhập ghi chú: `"Chuyển khoản ngân hàng"`.
  4. Nhấn "Xác nhận thanh toán".
* **Kết quả mong đợi:**
  * Trạng thái hóa đơn chuyển từ `UNPAID` sang `PAID` (được cập nhật trong bảng `assigned_fees`).
  * Tạo biên lai mới trong bảng `receipts` ghi nhận đầy đủ số tiền, ngày giờ, người thực hiện giao dịch.
  * Toast hiển thị thành công. Hóa đơn biến mất khỏi danh sách chưa nộp.

#### **TC-PAY-02: Lọc danh sách hóa đơn chưa nộp theo Đợt thu**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Tại tab Thanh Toán, chọn đợt thu `"Tháng 05/2026"` từ dropdown filter.
* **Kết quả mong đợi:**
  * Danh sách hóa đơn chưa thanh toán lọc lại và chỉ hiển thị các khoản phí thuộc kỳ thu tháng 05/2026.

#### **TC-PAY-03: Lọc danh sách hóa đơn chưa nộp theo Hộ dân**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Chọn hộ dân `"P201"` từ dropdown filter.
* **Kết quả mong đợi:**
  * Chỉ hiển thị các khoản phí còn nợ của riêng hộ P201.

#### **TC-PAY-04: Xem lịch sử biên lai thu tiền**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Nhấp chọn tab "Lịch Sử Biên Lai" trong phân hệ thanh toán.
* **Kết quả mong đợi:**
  * Hiển thị bảng danh sách toàn bộ các biên lai đã thu thành công từ MySQL bảng `receipts`.
  * Có đầy đủ các cột: Mã biên lai, Hộ dân, Khoản phí, Số tiền, Thời gian đóng, Ghi chú, Người thu.

#### **TC-PAY-05: Lọc danh sách biên lai theo Hộ dân**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Tại tab Lịch sử biên lai, chọn filter hộ dân = `P102`.
* **Kết quả mong đợi:**
  * Chỉ hiển thị các biên lai nộp tiền của riêng hộ P102.

#### **TC-PAY-06: Lọc danh sách biên lai theo khoảng thời gian**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Nhập trường "Từ ngày" và "Đến ngày" để lọc thời gian đóng tiền. Nhấn "Lọc".
* **Kết quả mong đợi:**
  * Bảng cập nhật hiển thị chính xác các biên lai được xuất ra trong khoảng thời gian đã nhập.

#### **TC-PAY-07: Hoàn tác thanh toán (Undo Payment)**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Vào modal hóa đơn chi tiết của hộ `P102`.
  2. Nhấn nút "Hoàn tác" (Undo/Cancel) trên khoản phí có trạng thái `PAID`.
* **Kết quả mong đợi:**
  * Trạng thái khoản phí chuyển từ `PAID` về `UNPAID`.
  * Biên lai tương ứng bị xóa hoặc đánh dấu hủy trong database MySQL.
  * Hóa đơn xuất hiện lại trong tab "Thanh Toán". Toast báo hoàn tác thành công.

#### **TC-PAY-08: Cư dân không thể xem hoặc thanh toán hóa đơn của căn hộ khác (Bảo mật phân quyền thanh toán cư dân)**
* **Mức độ:** Critical
* **Điều kiện tiên quyết:** Người dùng đăng nhập bằng tài khoản cư dân `resident1` (thuộc hộ/căn hộ `HH-A1201`).
* **Các bước thực hiện:**
  1. Vào trang thanh toán phí.
  2. Quan sát bộ lọc và danh sách hóa đơn hiển thị.
  3. Thử gọi API thanh toán của hộ khác `P102` bằng cách truyền mã hóa đơn `assignedFeeId` khác qua công cụ API Client (như Postman hoặc DevTools).
* **Kết quả mong đợi:**
  * Trên giao diện: Bộ lọc căn hộ bị khóa cứng ở căn hộ `HH-A1201` của chính họ. Không thể chọn xem hóa đơn hộ khác. Nút thanh toán "Pay" chỉ xuất hiện ở các khoản phí thuộc về `HH-A1201`.
  * Ở Backend: Request thanh toán hóa đơn của hộ khác bị chặn từ mức filter/controller. API trả về status `403 Forbidden` hoặc `400 Bad Request` kèm thông báo lỗi: `"You are not authorized to pay for another household's invoice!"`.

#### **TC-PAY-09: Kế toán/Admin xuất báo cáo danh sách biên lai thu tiền ra file Excel qua Apache POI**
* **Mức độ:** High
* **Điều kiện tiên quyết:** Đã đăng nhập bằng tài khoản `ROLE_ACCOUNTANT` hoặc `ROLE_ADMIN`. Đã có một số giao dịch thanh toán thành công trong cơ sở dữ liệu.
* **Các bước thực hiện:**
  1. Truy cập tab "Lịch Sử Biên Lai".
  2. Chọn bộ lọc thời gian nộp tiền và nhấn nút "Xuất file Excel" (Export to Excel).
* **Kết quả mong đợi:**
  * API `GET /api/exports/receipts` trả về file nhị phân định dạng `.xlsx` hoặc `.xls`.
  * Trình duyệt thực hiện tải xuống tệp tin thành công.
  * Mở file bằng Excel/Google Sheets: Hiển thị đầy đủ tiêu đề, các cột (Mã biên lai, Căn hộ, Tên phí, Số tiền nộp, Ngày nộp, Kế toán thực hiện, Ghi chú) được định dạng chuyên nghiệp và có dòng tính Tổng cộng số tiền thu ở cuối bảng.

#### **TC-PAY-10: Kế toán/Admin xuất báo cáo danh sách nợ phí theo đợt thu ra file Excel qua Apache POI**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Vào tab "Hộ Dân & Hóa Đơn", chọn đợt thu mong muốn.
  2. Click nút "Xuất danh sách nợ" (Export Unpaid/Debt List).
* **Kết quả mong đợi:**
  * Backend tạo file Excel chứa thông tin nợ phí thông qua thư viện Apache POI.
  * Tải xuống tệp Excel thành công.
  * Cấu trúc file Excel hiển thị chính xác danh sách các căn hộ còn nợ phí trong đợt thu đó, chi tiết số tiền nợ của từng loại phí, tổng nợ của từng hộ và tổng nợ của toàn đợt thu.

---

### 2.6 TC-STAT — Thống kê & Báo cáo số liệu

#### **TC-STAT-01: Xem tổng quan chỉ số thống kê**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Chuyển sang tab "Thống Kê" trong phân hệ thanh toán.
* **Kết quả mong đợi:**
  * Hiển thị 4 thẻ thống kê: Tổng Đã Thu, Còn Nợ, Tỷ Lệ Hoàn Thành, Tổng Hộ Dân.
  * Số tiền định dạng chuẩn tiền tệ Việt Nam (ví dụ: `1,250,000 ₫`).
  * Tỷ lệ hoàn thành được tính toán chuẩn xác từ tổng số tiền đã đóng chia cho tổng số tiền phải đóng.

#### **TC-STAT-02: Xem biểu đồ cột Doanh thu theo tháng**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Quan sát biểu đồ cột hiển thị doanh thu 12 tháng.
  2. Chọn năm khác trong dropdown filter năm.
* **Kết quả mong đợi:**
  * Biểu đồ canvas tải lại tương ứng với dữ liệu doanh thu thu được theo từng tháng của năm đã chọn.

#### **TC-STAT-03: Xem biểu đồ tròn phân chia theo loại phí**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Quan sát biểu đồ tròn phân tích cơ cấu doanh thu.
* **Kết quả mong đợi:**
  * Biểu đồ hiển thị tỷ lệ phần trăm đóng góp của các nhóm phí (Bắt buộc vs Tự nguyện) chính xác.

#### **TC-STAT-04: Xem danh sách các hộ nợ phí nhiều nhất**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Cuộn xuống phần "Top hộ nợ nhiều nhất".
* **Kết quả mong đợi:**
  * Bảng hiển thị danh sách các hộ gia đình có số nợ lớn nhất, sắp xếp theo thứ tự giảm dần của tổng nợ.
  * Nếu không có hộ nào nợ tiền, hiển thị thông điệp: *"Tất cả các hộ đã hoàn thành đóng phí!"*.

#### **TC-STAT-05: Kiểm tra tính đồng bộ và nhất quán của dữ liệu thống kê**
* **Mức độ:** Critical
* **Các bước thực hiện:**
  1. Ghi nhận số liệu "Tổng Đã Thu" đang hiển thị.
  2. Thực hiện thanh toán thành công 1 hóa đơn trị giá `200.000 ₫` (TC-PAY-01).
  3. Quay lại tab Thống Kê và kiểm tra chỉ số.
* **Kết quả mong đợi:**
  * Chỉ số "Tổng Đã Thu" tăng chính xác thêm `200.000 ₫`.
  * Số tiền "Còn Nợ" giảm đi `200.000 ₫`.

---

### 2.7 TC-PROFILE — Hồ sơ cá nhân người dùng

#### **TC-PROFILE-01: Xem thông tin hồ sơ cá nhân**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Đăng nhập bằng tài khoản cư dân `resident1`.
  2. Click "My Profile" trên sidebar.
* **Kết quả mong đợi:**
  * API `GET /api/profile` trả về thông tin người dùng từ token.
  * Màn hình hiển thị đầy đủ thông tin: Username, Họ tên, Vai trò, Phòng ở, Số điện thoại.

#### **TC-PROFILE-02: Cập nhật thông tin số điện thoại hợp lệ**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Thay đổi Số điện thoại thành `0999888777`.
  2. Nhấp nút "Save Changes".
* **Kết quả mong đợi:**
  * Backend xử lý cập nhật thông tin trong bảng `users` và cập nhật thông tin tương ứng sang bảng `residents` (đảm bảo tính đồng bộ dữ liệu nhân khẩu).
  * Toast hiển thị thành công. Dữ liệu mới được cập nhật trên giao diện.

#### **TC-PROFILE-03: Cập nhật thông tin với Họ tên trống (Kiểm thử biên)**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Xóa trắng trường Full Name trong form cập nhật.
  2. Nhấn "Save Changes".
* **Kết quả mong đợi:**
  * Giao diện chặn gửi request và hiển thị: *"Full Name cannot be left blank!"*.

#### **TC-PROFILE-04: Đổi mật khẩu thành công**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Mật khẩu cũ: `user123`, Mật khẩu mới: `newpass456`.
* **Các bước thực hiện:**
  1. Tại mục Đổi mật khẩu, điền đúng mật khẩu hiện tại và mật khẩu mới hợp lệ.
  2. Nhấn "Change Password".
* **Kết quả mong đợi:**
  * Backend kiểm tra mật khẩu hiện tại (BCrypt match), cập nhật hash mật khẩu mới vào DB.
  * Toast hiển thị thành công. Người dùng tự động bị đăng xuất, yêu cầu đăng nhập lại bằng mật khẩu mới thành công.

#### **TC-PROFILE-05: Đổi mật khẩu với mật khẩu cũ không đúng**
* **Mức độ:** High
* **Dữ liệu đầu vào:** Mật khẩu cũ: `wrongpass`, Mật khẩu mới: `newpass456`.
* **Các bước thực hiện:**
  1. Nhập sai mật khẩu cũ, nhập mật khẩu mới hợp lệ và nhấn "Change Password".
* **Kết quả mong đợi:**
  * API trả về lỗi `400 Bad Request`. Giao diện hiển thị Toast lỗi: *"Current password is incorrect!"*. Mật khẩu không bị đổi.

#### **TC-PROFILE-06: Đổi mật khẩu mới trùng mật khẩu cũ (Kiểm thử nghiệp vụ)**
* **Mức độ:** Medium
* **Dữ liệu đầu vào:** Mật khẩu mới: `user123` (trùng mật khẩu cũ).
* **Các bước thực hiện:**
  1. Nhập mật khẩu cũ là `user123`, nhập mật khẩu mới cũng là `user123`.
  2. Nhấn "Change Password".
* **Kết quả mong đợi:**
  * Hệ thống chặn và báo lỗi: *"New password cannot be the same as the old password!"*.

#### **TC-PROFILE-07: Đổi mật khẩu mới dưới 6 ký tự (Kiểm thử biên)**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Nhập mật khẩu mới = `12345` (5 ký tự).
* **Kết quả mong đợi:**
  * Hệ thống hiển thị cảnh báo: *"New password must be at least 6 characters long!"*.

---

### 2.8 TC-DASH — Bảng điều khiển (Dashboard)

#### **TC-DASH-01: Xem Dashboard với quyền Admin**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Đăng nhập bằng tài khoản admin.
* **Kết quả mong đợi:**
  * Dashboard hiển thị các số liệu thống kê chung: Tổng số căn hộ (120), Tổng số cư dân, Tỷ lệ hoàn thành đóng phí, Tổng số tài khoản hệ thống.
  * Biểu đồ SVG/Canvas hoạt động chính xác.
  * Phần "System Activity Log" hiển thị danh sách các hoạt động gần đây nhất lưu trong MySQL.
  * Lời chào: *"As a member of the Management Office (Admin)..."*.

#### **TC-DASH-02: Xem Dashboard với quyền Resident**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Đăng nhập bằng tài khoản cư dân.
* **Kết quả mong đợi:**
  * Khung chào hiển thị: *"As a registered Resident of unit..."* kèm mã căn hộ chính xác của cư dân (ví dụ: `Room 1204 - Block A`).
  * Các chức năng quản trị bị ẩn.

#### **TC-DASH-03: Nhật ký hoạt động (Activity Log) cập nhật thời gian thực**
* **Mức độ:** Medium
* **Các bước thực hiện:**
  1. Thực hiện tạo một hộ khẩu mới hoặc nộp tiền.
  2. Quay lại trang Dashboard, kiểm tra danh sách nhật ký hoạt động.
* **Kết quả mong đợi:**
  * Hoạt động vừa thực hiện xuất hiện ở dòng đầu tiên của nhật ký hoạt động trên Dashboard.

---

### 2.9 TC-DB — Cơ sở dữ liệu, API & Ràng buộc bảo mật (MySQL & Backend)

#### **TC-DB-01: Kiểm tra khởi tạo cơ sở dữ liệu MySQL lần đầu**
* **Mức độ:** Critical
* **Các bước thực hiện:**
  1. Chạy file script sql `schema.sql` và `data.sql` khởi tạo DB trên MySQL server.
  2. Khởi động ứng dụng Spring Boot.
* **Kết quả mong đợi:**
  * Các bảng `users`, `residents`, `households`, `fees`, `assigned_fees`, `receipts`, `activity_logs` được tạo thành công với các liên kết khóa ngoại chính xác.
  * Các dữ liệu seed mặc định (admin, resident1, các hộ dân mẫu, các khoản phí mẫu) được nạp đầy đủ vào database.

#### **TC-DB-02: Tính nhất quán của dữ liệu khi Reload trang**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Đăng nhập bằng admin, tạo thêm 1 cư dân mới.
  2. Nhấn phím F5 reload lại trang web.
* **Kết quả mong đợi:**
  * Dữ liệu cư dân mới vẫn hiển thị bình thường.
  * Thông tin được lưu trực tiếp vào cơ sở dữ liệu MySQL thông qua API, không bị mất khi reload (khác với LocalStorage ở v1.0).

#### **TC-DB-03: Quản lý Session bằng JWT Token**
* **Mức độ:** High
* **Các bước thực hiện:**
  1. Đăng nhập thành công vào hệ thống.
  2. Đóng tab trình duyệt hiện tại.
  3. Mở tab mới và truy cập lại vào địa chỉ web hệ thống.
* **Kết quả mong đợi:**
  * Nếu token lưu ở `sessionStorage`, người dùng sẽ phải đăng nhập lại (Đảm bảo an toàn bảo mật trên máy tính công cộng).
  * Nếu token hết hạn, mọi request gửi lên backend sẽ nhận phản hồi `401 Unauthorized` và tự động chuyển hướng về trang đăng nhập.

#### **TC-DB-04: Bảo mật thông tin mật khẩu (Mã hóa mật khẩu)**
* **Mức độ:** Critical (Bảo mật)
* **Các bước thực hiện:**
  1. Truy cập trực tiếp vào MySQL Workbench hoặc chạy lệnh query: `SELECT password FROM users WHERE username = 'admin';`.
* **Kết quả mong đợi:**
  * Giá trị mật khẩu lưu trong DB là một chuỗi ký tự đã được mã hóa BCrypt (dạng `$2a$10$...`), không hiển thị plain text `admin123`.

#### **TC-DB-05: Giới hạn lưu trữ Nhật ký hoạt động hệ thống**
* **Mức độ:** Low
* **Các bước thực hiện:**
  1. Thực hiện liên tiếp hơn 50 thao tác trong hệ thống để ghi nhật ký hoạt động.
  2. Xem danh sách nhật ký hoạt động trên Dashboard hoặc query trong DB.
* **Kết quả mong đợi:**
  * Giao diện chỉ hiển thị và lưu trữ tối đa 50 bản ghi nhật ký hoạt động mới nhất để tránh quá tải dung lượng và làm chậm truy vấn. Các bản ghi cũ tự động được loại bỏ khỏi danh sách hiển thị.

#### **TC-DB-06: Tự động kích hoạt chế độ dự phòng (Fallback Mode) sử dụng LocalStorage khi Backend mất kết nối**
* **Mức độ:** High
* **Điều kiện tiên quyết:** Cáp mạng/máy chủ backend tạm ngắt kết nối (Backend offline).
* **Các bước thực hiện:**
  1. Truy cập vào trang web ứng dụng hoặc tải lại trang hiện tại.
  2. Thực hiện thao tác truy xuất dữ liệu phí hoặc danh sách căn hộ.
* **Kết quả mong đợi:**
  * Hàm `checkHealth()` ping endpoint backend không phản hồi (timeout sau 1.5 giây).
  * Ứng dụng tự động kích hoạt `Fallback Mode` mà không làm sập giao diện người dùng.
  * Hiển thị một banner hoặc huy hiệu "Offline Mode / Dự Phòng" màu vàng/cam trên Topbar/Dashboard để cảnh báo người dùng.
  * Toàn bộ dữ liệu hiển thị và các thao tác tính toán, lưu trữ được chuyển qua giả lập trên LocalStorage của trình duyệt thay vì qua REST API.

#### **TC-DB-07: Đồng bộ dữ liệu ngược (Sync-back) giữa LocalStorage và giao diện Frontend**
* **Mức độ:** Medium
* **Điều kiện tiên quyết:** Hệ thống đang chạy ở chế độ Fullstack Mode.
* **Các bước thực hiện:**
  1. Thực hiện thanh toán thành công 1 khoản phí bất kỳ thông qua giao diện và REST API.
  2. Quan sát thay đổi trên các màn hình khác (như Dashboard hoặc Resident Manager) và kiểm tra LocalStorage của trình duyệt.
* **Kết quả mong đợi:**
  * Giao diện cập nhật ngay trạng thái `PAID` và số dư liên quan.
  * Đồng thời, Frontend tự động đồng bộ hóa trạng thái mới này xuống database LocalStorage để làm bản sao lưu dự phòng cập nhật nhất.
  * Các trang Dashboard, Resident hiển thị số liệu hoàn toàn đồng bộ mà không cần tải lại toàn bộ trang (F5).

---

## 3. TỔNG KẾT BỘ KỊCH BẢN KIỂM THỬ

| Module | Số TC | Critical | High | Medium | Low |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Authentication** | 12 | 3 | 7 | 2 | 0 |
| **User Management** | 10 | 2 | 6 | 2 | 0 |
| **Resident Manager** | 11 | 0 | 7 | 3 | 1 |
| **Fee Manager** | 17 | 5 | 8 | 3 | 1 |
| **Payment & Receipt** | 10 | 2 | 6 | 2 | 0 |
| **Statistics** | 5 | 1 | 2 | 2 | 0 |
| **Profile** | 7 | 0 | 3 | 4 | 0 |
| **Dashboard** | 3 | 0 | 1 | 2 | 0 |
| **Database & API** | 7 | 2 | 3 | 1 | 1 |
| **TỔNG CỘNG** | **82** | **15** | **43** | **21** | **3** |
