# 🏢 Cyberspace + BlueMoon — Fullstack Project

Hệ thống quản lý khu dân cư tích hợp Frontend SPA + Backend REST API.

---

## 📁 Cấu trúc dự án

```
project/
├── docker-compose.yml       ← ⭐ Khởi động toàn bộ hệ thống bằng Docker
├── .env.example             ← Cấu hình môi trường cho Docker Compose
├── start-docker.sh           ← Script tiện ích: build & chạy
├── stop-docker.sh             ← Script tiện ích: dừng hệ thống
│
├── frontend/                ← Giao diện người dùng (HTML/CSS/JS)
│   ├── Dockerfile           ← Build image Nginx phục vụ static SPA
│   ├── nginx.conf           ← Cấu hình Nginx (SPA fallback + proxy /api)
│   ├── index.html
│   ├── css/
│   │   ├── styles.css
│   │   └── variables.css
│   └── js/
│       ├── api.js          ← ⭐ Kết nối Backend API
│       ├── app.js          ← Entry point SPA
│       ├── auth.js         ← Authentication
│       ├── db.js           ← Shim compatibility
│       └── components/
│           ├── dashboard.js
│           ├── sidebar.js
│           ├── users.js
│           ├── profile.js
│           ├── residents.js
│           ├── fees.js
│           └── payment.js
│
└── backend/                ← REST API (Node.js + Express)
    ├── Dockerfile           ← Build image Node.js cho API
    ├── .dockerignore
    ├── src/
    │   ├── server.js       ← Entry point
    │   ├── controllers/    ← Request handlers
    │   ├── models/         ← Data layer
    │   ├── middleware/     ← JWT auth, error handler
    │   ├── routes/         ← API routes
    │   └── utils/          ← DB helper, seed data
    ├── data/               ← JSON files (tự tạo khi chạy lần đầu)
    ├── .env
    └── package.json
```

---

## 🐳 Chạy bằng Docker (khuyên dùng — nhanh nhất)

Yêu cầu: đã cài [Docker](https://www.docker.com/) và Docker Compose (có sẵn trong Docker Desktop).

### Cách 1 — Dùng script tiện ích

```bash
./start-docker.sh
```

Truy cập: **http://localhost:8080**

Dừng hệ thống:
```bash
./stop-docker.sh
```

### Cách 2 — Dùng docker compose trực tiếp

```bash
# Build & chạy
docker compose up -d --build

# Xem logs
docker compose logs -f

# Dừng (giữ data)
docker compose down

# Dừng & xóa luôn data
docker compose down -v
```

### Kiến trúc Docker

| Service    | Container             | Port (host) | Mô tả                          |
|------------|------------------------|-------------|----------------------------------|
| `backend`  | cyberspace-backend     | 3000        | Node.js + Express API            |
| `frontend` | cyberspace-frontend    | 8080        | Nginx phục vụ SPA + proxy `/api` |

Dữ liệu JSON database được lưu trong Docker volume `backend_data`, không bị mất khi restart container.

Tùy chỉnh biến môi trường: copy `.env.example` → `.env` ở thư mục gốc rồi sửa giá trị (JWT_SECRET, ADMIN_SECRET_KEY, v.v.) trước khi `docker compose up`.

---

## 🛠️ Chạy thủ công (không dùng Docker)

### Bước 1: Chạy Backend

```bash
cd backend
npm install
npm run dev
```
→ API chạy tại: **http://localhost:3000**

### Bước 2: Chạy Frontend

Mở `frontend/index.html` bằng một trong các cách:

**Cách A — VS Code Live Server (khuyên dùng)**
1. Cài extension "Live Server" trong VS Code
2. Click chuột phải vào `index.html` → "Open with Live Server"
3. Mặc định chạy tại: http://localhost:5500

**Cách B — Python HTTP Server**
```bash
cd frontend
python -m http.server 5500
# Truy cập: http://localhost:5500
```

**Cách C — Node.js serve**
```bash
npx serve frontend -p 5500
```

---

## 🔑 Tài khoản mặc định

| Username   | Password  | Role  |
|------------|-----------|-------|
| admin      | admin123  | Admin |
| resident1  | user123   | User  |
| resident2  | user123   | User  |

---

## ⚙️ Cấu hình CORS

Nếu frontend chạy trên port khác 5500, cập nhật file `backend/.env`:

```
CORS_ORIGIN=http://localhost:YOUR_PORT
```

Hoặc để `CORS_ORIGIN=*` để cho phép tất cả (chỉ dùng khi develop).

---

## 📋 API Endpoints tổng quan

| Module      | Base URL         |
|-------------|-----------------|
| Auth        | /api/auth        |
| Users       | /api/users       |
| Fees        | /api/fees        |
| Payments    | /api/payments    |
| Residents   | /api/residents   |
| Logs        | /api/logs        |

Xem chi tiết trong `backend/README.md`.
