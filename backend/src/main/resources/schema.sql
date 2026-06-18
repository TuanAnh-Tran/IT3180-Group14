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
    calc_method ENUM('FIXED','PER_PERSON','PER_M2','PER_VEHICLE','PER_MOTORCYCLE','PER_CAR','CONSUMPTION')
                NOT NULL COMMENT 'Phương thức tính',
    price       DECIMAL(15,2)   NOT NULL COMMENT 'Đơn giá (VNĐ)'
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
    amount_paid_accumulated DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Số tiền lũy kế đã nộp',
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
-- 5. UTILITY_RECORD (Chỉ số tiêu thụ điện nước)
-- ============================================================
CREATE TABLE IF NOT EXISTS utility_record (
    id              VARCHAR(50)     PRIMARY KEY,
    household_id    VARCHAR(50)     NOT NULL,
    period_id       VARCHAR(50)     NOT NULL,
    type            VARCHAR(50)     NOT NULL COMMENT 'WATER, ELECTRICITY, etc.',
    old_index       INT             NOT NULL DEFAULT 0,
    new_index       INT             NOT NULL DEFAULT 0,

    FOREIGN KEY (household_id) REFERENCES household(id),
    FOREIGN KEY (period_id)    REFERENCES collection_period(id),
    UNIQUE KEY uq_utility (household_id, period_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. RECEIPT (Biên lai)
--    Module: Thu phí (Anh Hiếu) - Tạo và quản lý
-- ============================================================
CREATE TABLE IF NOT EXISTS receipt (
    id              VARCHAR(50)     PRIMARY KEY,
    assigned_fee_id VARCHAR(50)     NOT NULL,
    amount_paid     DECIMAL(15,2)   NOT NULL COMMENT 'Số tiền đã nộp',
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
('HH001', 'P101', 1, 'Nguyen Van An',  '0987654321', 3, 65.5, 1, 0, 'OCCUPIED', 'Completed permanent residence registration.'),
('HH002', 'P102', 1, 'Tran Thi Binh',  '0911222333', 4, 80.0, 2, 1, 'OCCUPIED', 'One temporary resident.'),
('HH003', 'P201', 2, 'Le Van Cuong',   '0901111222', 2, 50.0, 1, 0, 'OCCUPIED', 'Fee module sample household.'),
('HH004', 'P202', 2, 'Pham Thi Dung',   '0900000202', 5, 90.0, 0, 1, 'OCCUPIED', 'Fee module sample household.'),
('HH005', 'P301', 3, 'Hoang Van Emin',  '0900000301', 1, 45.0, 1, 0, 'OCCUPIED', 'Fee module sample household.');

-- Nhân khẩu mẫu
INSERT IGNORE INTO resident
(id, full_name, gender, date_of_birth, identity_no, phone, hometown, occupation, relationship_to_head, status, household_id)
VALUES
('RES-AN001',   'Nguyen Van An', 'Male',   '1985-04-12', '001085000111', '0987654321', 'Hanoi',     'Engineer',   'Head',   'PERMANENT', 'HH001'),
('RES-HA002',   'Le Thu Ha',     'Female', '1988-08-20', '001188000222', '0977000111', 'Hanoi',     'Teacher',    'Spouse', 'PERMANENT', 'HH001'),
('RES-BINH003', 'Tran Thi Binh', 'Female', '1979-01-15', '031079000333', '0911222333', 'Nam Dinh',  'Accountant', 'Head',   'PERMANENT', 'HH002'),
('RES-DUC004',  'Pham Minh Duc', 'Male',   '1998-11-02', '022098000444', '0909090909', 'Hai Phong', 'Student',    'Tenant', 'TEMPORARY', 'HH002');

-- Khoản phí mẫu
INSERT IGNORE INTO fee (id, name, type, calc_method, price) VALUES
('FEE001', 'Apartment Management Fee',    'MANDATORY', 'PER_M2',     15000),
('FEE002', 'Waste Cleaning Fee',          'MANDATORY', 'PER_PERSON',  72000),
('FEE003', 'Motorcycle Parking Fee',     'VEHICLE',   'PER_MOTORCYCLE', 70000),
('FEE004', 'Car Parking Fee',            'VEHICLE',   'PER_CAR', 150000),
('FEE005', 'Welfare Fund',                'VOLUNTARY', 'PER_PERSON',  20000),
('FEE006', 'Invalids & Martyrs Day Contribution 27/07', 'VOLUNTARY', 'FIXED', 50000),
('FEE007', 'Childrens Day Donation',     'VOLUNTARY', 'FIXED',       50000),
('FEE008', 'Donation for the Poor',       'VOLUNTARY', 'FIXED',       50000),
('FEE009', 'Running Water Fee',          'UTILITY',   'CONSUMPTION', 15000),
('FEE_DEBT', 'Previous Period Debt',     'MANDATORY', 'FIXED', 1.00);

-- Đợt thu mẫu
INSERT IGNORE INTO collection_period (id, name, status, created_at) VALUES
('PER001', 'May 2025 Cycle', 'OPEN',   NOW()),
('PER002', 'April 2025 Cycle', 'CLOSED', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- Chỉ số điện nước tiêu thụ mẫu
INSERT IGNORE INTO utility_record (id, household_id, period_id, type, old_index, new_index) VALUES
('UT001', 'HH001', 'PER001', 'WATER', 100, 115), -- Consumption = 15
('UT002', 'HH002', 'PER001', 'WATER', 200, 220), -- Consumption = 20
('UT003', 'HH003', 'PER001', 'WATER', 150, 160); -- Consumption = 10

-- Phí gán mẫu (UNPAID, PAID, PARTIAL)
INSERT IGNORE INTO assigned_fee (id, household_id, period_id, fee_id, quantity, status, amount_paid_accumulated, paid_at) VALUES
-- Period May 2025 - HH001
('AF001', 'HH001', 'PER001', 'FEE001', 1, 'UNPAID', 0.00, NULL),
('AF002', 'HH001', 'PER001', 'FEE002', 1, 'PARTIAL', 100000.00, NOW()), -- Required: 216000 (members: 3 * 72000)
('AF003', 'HH001', 'PER001', 'FEE003', 1, 'UNPAID', 0.00, NULL),
('AF009w', 'HH001', 'PER001', 'FEE009', 15, 'UNPAID', 0.00, NULL), -- Water: 15 * 15000 = 225000
-- Period May 2025 - HH002
('AF004', 'HH002', 'PER001', 'FEE001', 1, 'PAID', 1200000.00, NOW()), -- Required: 1200000 (area: 80 * 15000)
('AF005', 'HH002', 'PER001', 'FEE002', 1, 'PAID', 288000.00, NOW()), -- Required: 288000 (members: 4 * 72000)
('AF006', 'HH002', 'PER001', 'FEE003', 2, 'UNPAID', 0.00, NULL),
('AF007', 'HH002', 'PER001', 'FEE004', 1, 'UNPAID', 0.00, NULL),
('AF009x', 'HH002', 'PER001', 'FEE009', 20, 'UNPAID', 0.00, NULL),
-- Period May 2025 - HH003
('AF008', 'HH003', 'PER001', 'FEE001', 1, 'UNPAID', 0.00, NULL),
('AF009', 'HH003', 'PER001', 'FEE002', 1, 'PAID', 144000.00, NOW()), -- Required: 144000 (members: 2 * 72000)
('AF009y', 'HH003', 'PER001', 'FEE009', 10, 'UNPAID', 0.00, NULL),
-- Period May 2025 - HH004
('AF010', 'HH004', 'PER001', 'FEE001', 1, 'UNPAID', 0.00, NULL),
('AF011', 'HH004', 'PER001', 'FEE004', 1, 'UNPAID', 0.00, NULL),
-- Period April 2025 - HH001 (Closed)
('AF012', 'HH001', 'PER002', 'FEE001', 1, 'PAID', 982500.00, DATE_SUB(NOW(), INTERVAL 20 DAY)), -- Required: 982500 (area: 65.5 * 15000)
('AF013', 'HH001', 'PER002', 'FEE002', 1, 'PAID', 216000.00, DATE_SUB(NOW(), INTERVAL 20 DAY)); -- Required: 216000 (members: 3 * 72000)

-- Biên lai thanh toán mẫu (tương ứng với các PAID ở trên)
INSERT IGNORE INTO receipt (id, assigned_fee_id, amount_paid, paid_at, note, created_by) VALUES
('RC001', 'AF004', 1200000.00, NOW(),                          'Bank Transfer', 'admin'),
('RC002', 'AF005',  288000.00, NOW(),                          NULL,            'admin'),
('RC003', 'AF009',  144000.00, NOW(),                          'Cash',          'admin'),
('RC004', 'AF012',  982500.00, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL,            'admin'),
('RC005', 'AF013',  216000.00, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL,            'admin'),
('RCP01', 'AF002',  100000.00, NOW(),                          'Partial Payment Test', 'admin');
