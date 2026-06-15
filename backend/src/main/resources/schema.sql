-- ============================================================
-- APARTMENT MANAGEMENT SYSTEM - Database Schema
-- MySQL - Chạy lệnh này để tạo database và tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS apartment_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE apartment_db;

-- ============================================================
-- 1. HOUSEHOLD (Hộ gia đình)
--    Module: Hộ khẩu (Khôi) - Tạo và quản lý
-- ============================================================
CREATE TABLE IF NOT EXISTS household (
    id              VARCHAR(50)    PRIMARY KEY,
    apartment_no    VARCHAR(50)    NULL COMMENT 'Apartment number',
    floor           INT            NULL COMMENT 'Floor number',
    owner_name      VARCHAR(255)   NOT NULL COMMENT 'Tên chủ hộ',
    phone           VARCHAR(30)    NULL COMMENT 'Phone number',
    members_count   INT            DEFAULT 0 COMMENT 'Số thành viên',
    area            DOUBLE         DEFAULT 0 COMMENT 'Diện tích (m2)',
    motorcycle_count INT           DEFAULT 0 COMMENT 'Số xe máy',
    car_count       INT            DEFAULT 0 COMMENT 'Số ô tô',
    status          ENUM('OCCUPIED','TEMPORARILY_AWAY','MOVED_OUT','VACANT')
                    NOT NULL DEFAULT 'OCCUPIED',
    note            VARCHAR(1000)  NULL,
    UNIQUE KEY uk_household_apartment_no (apartment_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 1B. RESIDENT (Resident registry)
--    Module: Resident Management
-- ============================================================
CREATE TABLE IF NOT EXISTS resident (
    id                   VARCHAR(50)    PRIMARY KEY,
    full_name            VARCHAR(255)   NOT NULL,
    gender               VARCHAR(20)    NULL,
    date_of_birth        DATE           NULL,
    identity_no          VARCHAR(30)    NOT NULL UNIQUE,
    phone                VARCHAR(30)    NULL,
    hometown             VARCHAR(255)   NULL,
    occupation           VARCHAR(255)   NULL,
    relationship_to_head VARCHAR(100)   NULL,
    status               ENUM('PERMANENT','TEMPORARY','TEMPORARILY_AWAY','MOVED_OUT')
                         NOT NULL DEFAULT 'PERMANENT',
    household_id         VARCHAR(50)    NULL,
    created_at           DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id) REFERENCES household(id),

    INDEX idx_resident_identity (identity_no),
    INDEX idx_resident_household (household_id),
    INDEX idx_resident_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resident_activity_log (
    id           VARCHAR(50)    PRIMARY KEY,
    actor        VARCHAR(100)   NULL,
    action       VARCHAR(100)   NOT NULL,
    target_type  VARCHAR(50)    NOT NULL,
    target_id    VARCHAR(50)    NOT NULL,
    detail       VARCHAR(1000)  NULL,
    created_at   DATETIME       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_resident_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. FEE (Khoản phí)
--    Module: Khoản thu (Phùng Việt Cường) - Tạo và quản lý
-- ============================================================
CREATE TABLE IF NOT EXISTS fee (
    id          VARCHAR(50)     PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL COMMENT 'Tên khoản phí',
    type        ENUM('MANDATORY','VOLUNTARY','VEHICLE','UTILITY')
                NOT NULL COMMENT 'Loại phí',
    calc_method ENUM('FIXED','PER_PERSON','PER_M2','PER_VEHICLE')
                NOT NULL COMMENT 'Phương thức tính',
    price       DOUBLE          NOT NULL COMMENT 'Đơn giá (VNĐ)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. COLLECTION_PERIOD (Đợt thu phí)
--    Module: Đợt thu phí (Phùng Việt Cường) - Tạo và quản lý
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_period (
    id          VARCHAR(50)     PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL COMMENT 'Tên đợt thu',
    status      ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. ASSIGNED_FEE (Phí gán cho hộ theo đợt)
--    Module: Đợt thu phí (Phùng Việt Cường) - Tạo
--    Module: Thu phí (Anh Hiếu) - Cập nhật status, paidAt
-- ============================================================
CREATE TABLE IF NOT EXISTS assigned_fee (
    id              VARCHAR(50)     PRIMARY KEY,
    household_id    VARCHAR(50)     NOT NULL,
    period_id       VARCHAR(50)     NOT NULL,
    fee_id          VARCHAR(50)     NOT NULL,
    quantity        DOUBLE          NOT NULL DEFAULT 1 COMMENT 'Số lượng',
    status          ENUM('UNPAID','PAID','PARTIAL') NOT NULL DEFAULT 'UNPAID',
    paid_at         DATETIME        NULL COMMENT 'Thời điểm thanh toán',

    FOREIGN KEY (household_id) REFERENCES household(id),
    FOREIGN KEY (period_id)    REFERENCES collection_period(id),
    FOREIGN KEY (fee_id)       REFERENCES fee(id),

    INDEX idx_status      (status),
    INDEX idx_period      (period_id),
    INDEX idx_household   (household_id),
    INDEX idx_period_status (period_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. RECEIPT (Biên lai)
--    Module: Thu phí (Anh Hiếu) - Tạo và quản lý
-- ============================================================
CREATE TABLE IF NOT EXISTS receipt (
    id              VARCHAR(50)     PRIMARY KEY,
    assigned_fee_id VARCHAR(50)     NOT NULL,
    amount_paid     DOUBLE          NOT NULL COMMENT 'Số tiền đã nộp',
    paid_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note            VARCHAR(500)    NULL COMMENT 'Ghi chú',
    created_by      VARCHAR(100)    NULL COMMENT 'Người thu tiền',
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (assigned_fee_id) REFERENCES assigned_fee(id),

    INDEX idx_paid_at       (paid_at),
    INDEX idx_assigned_fee  (assigned_fee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DỮ LIỆU MẪU (để test)
-- ============================================================

-- Hộ gia đình mẫu
INSERT IGNORE INTO household
(id, apartment_no, floor, owner_name, phone, members_count, area, motorcycle_count, car_count, status, note)
VALUES
('HH-A1201', 'A1201', 12, 'Nguyen Van An',  '0987654321', 2, 72.5, 2, 0, 'OCCUPIED', 'Completed permanent residence registration.'),
('HH-B0805', 'B0805',  8, 'Tran Thi Binh',  '0911222333', 2, 65.0, 1, 1, 'OCCUPIED', 'One temporary resident.'),
('HH-C0302', 'C0302',  3, 'Le Hoang Nam',   '0901111222', 0, 58.0, 0, 0, 'VACANT',   'Ready for handover.'),
('HH001',    'P101',   1, 'Nguyen Van Hung', '0900000101', 4, 75.0, 1, 0, 'OCCUPIED', 'Fee module sample household.'),
('HH002',    'P102',   1, 'Tran Thi Tuyet',  '0900000102', 2, 60.0, 2, 1, 'OCCUPIED', 'Fee module sample household.'),
('HH003',    'P201',   2, 'Pham Minh Tuan',  '0900000201', 5, 110.0, 1, 0, 'OCCUPIED', 'Fee module sample household.'),
('HH004',    'P202',   2, 'Le Hoang Nam',    '0900000202', 3, 85.0, 0, 1, 'OCCUPIED', 'Fee module sample household.'),
('HH005',    'P301',   3, 'Hoang Duc Long',  '0900000301', 1, 45.0, 1, 0, 'OCCUPIED', 'Fee module sample household.');

INSERT IGNORE INTO resident
(id, full_name, gender, date_of_birth, identity_no, phone, hometown, occupation, relationship_to_head, status, household_id)
VALUES
('RES-AN001',   'Nguyen Van An', 'Male',   '1985-04-12', '001085000111', '0987654321', 'Hanoi',     'Engineer',   'Head',   'PERMANENT', 'HH-A1201'),
('RES-HA002',   'Le Thu Ha',     'Female', '1988-08-20', '001188000222', '0977000111', 'Hanoi',     'Teacher',    'Spouse', 'PERMANENT', 'HH-A1201'),
('RES-BINH003', 'Tran Thi Binh', 'Female', '1979-01-15', '031079000333', '0911222333', 'Nam Dinh',  'Accountant', 'Head',   'PERMANENT', 'HH-B0805'),
('RES-DUC004',  'Pham Minh Duc', 'Male',   '1998-11-02', '022098000444', '0909090909', 'Hai Phong', 'Student',    'Tenant', 'TEMPORARY', 'HH-B0805');

-- Khoản phí mẫu
INSERT IGNORE INTO fee VALUES
('FEE001', 'Phí quản lý',    'MANDATORY', 'PER_M2',     15000),
('FEE002', 'Phí vệ sinh',    'MANDATORY', 'FIXED',      80000),
('FEE003', 'Phí xe máy',     'VEHICLE',   'PER_VEHICLE', 70000),
('FEE004', 'Phí ô tô',       'VEHICLE',   'PER_VEHICLE', 150000),
('FEE005', 'Quỹ phúc lợi',   'VOLUNTARY', 'PER_PERSON', 20000);

-- Đợt thu mẫu
INSERT IGNORE INTO collection_period VALUES
('PER001', 'Đợt thu Tháng 5/2025', 'OPEN',   NOW()),
('PER002', 'Đợt thu Tháng 4/2025', 'CLOSED', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- Phí gán mẫu (UNPAID và PAID)
INSERT IGNORE INTO assigned_fee (id, household_id, period_id, fee_id, quantity, status, paid_at) VALUES
-- Đợt 5/2025 - HH001
('AF001', 'HH001', 'PER001', 'FEE001', 1, 'UNPAID', NULL),
('AF002', 'HH001', 'PER001', 'FEE002', 1, 'UNPAID', NULL),
('AF003', 'HH001', 'PER001', 'FEE003', 1, 'UNPAID', NULL),
-- Đợt 5/2025 - HH002
('AF004', 'HH002', 'PER001', 'FEE001', 1, 'PAID',   NOW()),
('AF005', 'HH002', 'PER001', 'FEE002', 1, 'PAID',   NOW()),
('AF006', 'HH002', 'PER001', 'FEE003', 2, 'UNPAID', NULL),
('AF007', 'HH002', 'PER001', 'FEE004', 1, 'UNPAID', NULL),
-- Đợt 5/2025 - HH003
('AF008', 'HH003', 'PER001', 'FEE001', 1, 'UNPAID', NULL),
('AF009', 'HH003', 'PER001', 'FEE002', 1, 'PAID',   NOW()),
-- Đợt 5/2025 - HH004
('AF010', 'HH004', 'PER001', 'FEE001', 1, 'UNPAID', NULL),
('AF011', 'HH004', 'PER001', 'FEE004', 1, 'UNPAID', NULL),
-- Đợt 4/2025 - HH001 (đã đóng)
('AF012', 'HH001', 'PER002', 'FEE001', 1, 'PAID',   DATE_SUB(NOW(), INTERVAL 20 DAY)),
('AF013', 'HH001', 'PER002', 'FEE002', 1, 'PAID',   DATE_SUB(NOW(), INTERVAL 20 DAY));

-- Biên lai mẫu (tương ứng với các PAID ở trên)
INSERT IGNORE INTO receipt (id, assigned_fee_id, amount_paid, paid_at, note, created_by) VALUES
('RC001', 'AF004', 1200000, NOW(),                          'Chuyển khoản', 'admin'),
('RC002', 'AF005',   80000, NOW(),                          NULL,            'admin'),
('RC003', 'AF009',   80000, NOW(),                          'Tiền mặt',      'admin'),
('RC004', 'AF012',  982500, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL,          'admin'),
('RC005', 'AF013',   80000, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL,          'admin');
