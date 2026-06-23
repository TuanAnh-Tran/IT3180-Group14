# 🏢 Cyberspace + BlueMoon — Backend API

REST API cho hệ thống quản lý khu dân cư, viết bằng **Node.js + Express.js**.

---

## 🚀 Cài đặt & Chạy

```bash
# 1. Vào thư mục backend
cd backend

# 2. Cài dependencies
npm install

# 3. Copy file cấu hình môi trường
cp .env.example .env
# Chỉnh sửa .env nếu cần (port, JWT secret, v.v.)

# 4. Chạy server (development)
npm run dev

# 5. Hoặc chạy production
npm start
```

Server sẽ chạy tại: **http://localhost:3000**

---

## 📁 Cấu trúc thư mục

```
backend/
├── data/               ← Database JSON files (tự tạo khi chạy)
│   ├── users.json
│   ├── logs.json
│   ├── fees.json
│   ├── households.json
│   ├── periods.json
│   ├── assigned_fees.json
│   ├── receipts.json
│   └── residents.json
├── src/
│   ├── controllers/    ← Logic xử lý request
│   ├── middleware/     ← Auth JWT, Error handler
│   ├── models/         ← CRUD data layer
│   ├── routes/         ← Định nghĩa endpoints
│   ├── utils/          ← Database helper, Seed data
│   └── server.js       ← Entry point
├── .env                ← Cấu hình (không commit lên git)
├── .env.example        ← Template cấu hình
└── package.json
```

---

## 🔑 Authentication

API sử dụng **JWT Bearer Token**.

```
Authorization: Bearer <token>
```

Token được trả về sau khi đăng nhập hoặc đăng ký thành công.

### Tài khoản mẫu
| Username   | Password  | Role  |
|------------|-----------|-------|
| admin      | admin123  | admin |
| resident1  | user123   | user  |
| resident2  | user123   | user  |

---

## 📋 API Endpoints

### Auth
| Method | Endpoint                    | Auth     | Mô tả                   |
|--------|-----------------------------|----------|--------------------------|
| POST   | `/api/auth/login`           | ❌        | Đăng nhập                |
| POST   | `/api/auth/register`        | ❌        | Đăng ký tài khoản mới   |
| GET    | `/api/auth/me`              | ✅        | Lấy thông tin hiện tại  |
| PUT    | `/api/auth/change-password` | ✅        | Đổi mật khẩu            |
| PUT    | `/api/auth/profile`         | ✅        | Cập nhật hồ sơ          |

### Users (Admin only)
| Method | Endpoint                              | Mô tả                     |
|--------|---------------------------------------|---------------------------|
| GET    | `/api/users`                          | Danh sách tất cả users    |
| GET    | `/api/users/:username`                | Chi tiết 1 user           |
| POST   | `/api/users`                          | Tạo user mới              |
| PUT    | `/api/users/:username`                | Cập nhật thông tin user   |
| DELETE | `/api/users/:username`                | Xóa user                  |
| PATCH  | `/api/users/:username/role`           | Đổi role                  |
| PATCH  | `/api/users/:username/reset-password` | Reset mật khẩu            |

### Fees
| Method | Endpoint                        | Auth   | Mô tả                      |
|--------|---------------------------------|--------|----------------------------|
| GET    | `/api/fees/fees`                | User   | Danh sách khoản thu        |
| POST   | `/api/fees/fees`                | Admin  | Tạo khoản thu mới          |
| PUT    | `/api/fees/fees/:id`            | Admin  | Cập nhật khoản thu         |
| DELETE | `/api/fees/fees/:id`            | Admin  | Xóa khoản thu              |
| GET    | `/api/fees/households`          | User   | Danh sách hộ gia đình      |
| POST   | `/api/fees/households`          | Admin  | Thêm hộ                    |
| PUT    | `/api/fees/households/:id`      | Admin  | Sửa hộ                     |
| DELETE | `/api/fees/households/:id`      | Admin  | Xóa hộ                     |
| GET    | `/api/fees/periods`             | User   | Danh sách đợt thu          |
| POST   | `/api/fees/periods`             | Admin  | Tạo đợt thu mới            |
| PATCH  | `/api/fees/periods/:id/status`  | Admin  | Đổi trạng thái đợt         |
| GET    | `/api/fees/periods/:id/stats`   | User   | Thống kê tiến độ đợt       |
| GET    | `/api/fees/assigned`            | User   | Danh sách phí gán (?periodId / ?householdId) |
| POST   | `/api/fees/assigned`            | Admin  | Gán / cập nhật phí         |
| DELETE | `/api/fees/assigned/:id`        | Admin  | Xóa phí gán                |

### Payments
| Method | Endpoint                       | Auth  | Mô tả                  |
|--------|--------------------------------|-------|------------------------|
| POST   | `/api/payments`                | Admin | Ghi nhận thanh toán    |
| DELETE | `/api/payments/:assignedFeeId` | Admin | Hoàn tác thanh toán    |
| GET    | `/api/payments/receipts`       | User  | Danh sách biên lai     |
| GET    | `/api/payments/stats`          | Admin | Thống kê doanh thu     |

### Residents (Nhân khẩu)
| Method | Endpoint              | Auth  | Mô tả                  |
|--------|-----------------------|-------|------------------------|
| GET    | `/api/residents`      | User  | Danh sách nhân khẩu    |
| GET    | `/api/residents/:id`  | User  | Chi tiết               |
| POST   | `/api/residents`      | Admin | Thêm nhân khẩu         |
| PUT    | `/api/residents/:id`  | Admin | Sửa nhân khẩu          |
| DELETE | `/api/residents/:id`  | Admin | Xóa nhân khẩu          |

### Logs (Admin only)
| Method | Endpoint    | Mô tả                |
|--------|-------------|----------------------|
| GET    | `/api/logs` | Nhật ký hệ thống     |

---

## 🔌 Kết nối Frontend

Trong file frontend JS, cập nhật `API_BASE_URL`:

```js
const API_BASE = 'http://localhost:3000/api';
```

Ví dụ gọi API đăng nhập:
```js
const res = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { token, user } = await res.json();
```

---

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Database**: JSON file (có thể nâng cấp lên MongoDB/PostgreSQL)
- **Logging**: morgan
- **CORS**: cors

---

## ⚙️ Environment Variables

| Biến              | Mặc định                      | Mô tả                           |
|-------------------|-------------------------------|----------------------------------|
| PORT              | 3000                          | Port server                      |
| NODE_ENV          | development                   | Môi trường                       |
| JWT_SECRET        | (cần đổi!)                   | Secret key cho JWT               |
| JWT_EXPIRES_IN    | 8h                            | Thời hạn token                   |
| ADMIN_SECRET_KEY  | CYBER@ADMIN2025               | Key để đăng ký tài khoản admin  |
| CORS_ORIGIN       | *                             | Frontend origin được phép        |
| DATA_DIR          | ./data                        | Thư mục lưu file JSON            |
