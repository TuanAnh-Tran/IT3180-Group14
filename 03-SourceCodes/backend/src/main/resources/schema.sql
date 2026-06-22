-- ============================================================
-- APARTMENT MANAGEMENT SYSTEM - Database Schema
-- MySQL - Chạy lệnh này để tạo database và tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS apartment_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE apartment_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS resident;
DROP TABLE IF EXISTS vehicle;
DROP TABLE IF EXISTS utility_record_history;
DROP TABLE IF EXISTS utility_record;
DROP TABLE IF EXISTS receipt;
DROP TABLE IF EXISTS assigned_fee;
DROP TABLE IF EXISTS collection_period;
DROP TABLE IF EXISTS fee;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS household;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 0. USERS (Tài khoản người dùng)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(50)    PRIMARY KEY,
    username        VARCHAR(255)   NOT NULL UNIQUE,
    password_hash   VARCHAR(255)   NOT NULL,
    full_name       VARCHAR(255)   NOT NULL,
    role            VARCHAR(50)    NOT NULL DEFAULT 'RESIDENT',
    room            VARCHAR(50)    NULL,
    phone           VARCHAR(20)    NULL,
    identity_no     VARCHAR(50)    NULL,
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts INT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 1. HOUSEHOLD (Hộ gia đình)
--    Module: Hộ khẩu (Khôi) - Tạo và quản lý
-- ============================================================
CREATE TABLE IF NOT EXISTS household (
    id              VARCHAR(50)    PRIMARY KEY,
    owner_name      VARCHAR(255)   NOT NULL COMMENT 'Tên chủ hộ',
    members_count   INT            DEFAULT 0 COMMENT 'Số thành viên',
    area            DOUBLE         DEFAULT 0 COMMENT 'Diện tích (m2)',
    motorcycle_count INT           DEFAULT 0 COMMENT 'Số xe máy',
    car_count       INT            DEFAULT 0 COMMENT 'Số ô tô',
    apartment_no    VARCHAR(50)    NULL,
    floor           INT            NULL,
    phone           VARCHAR(50)    NULL,
    status          VARCHAR(50)    NULL,
    note            VARCHAR(500)   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 1.1. RESIDENT (Nhân khẩu / Cư dân)
-- ============================================================
CREATE TABLE IF NOT EXISTS resident (
    id                 VARCHAR(50)    PRIMARY KEY,
    full_name          VARCHAR(255)   NOT NULL COMMENT 'Họ và tên',
    gender             VARCHAR(50)    NOT NULL COMMENT 'Giới tính',
    date_of_birth      VARCHAR(50)    NULL     COMMENT 'Ngày sinh',
    identity_no        VARCHAR(50)    NOT NULL UNIQUE COMMENT 'CMND/CCCD',
    phone              VARCHAR(50)    NULL     COMMENT 'Số điện thoại',
    hometown           VARCHAR(255)   NULL     COMMENT 'Quê quán',
    ethnicity          VARCHAR(50)    NULL     COMMENT 'Dân tộc',
    occupation         VARCHAR(255)   NULL     COMMENT 'Nghề nghiệp',
    workplace          VARCHAR(255)   NULL     COMMENT 'Nơi làm việc',
    status             VARCHAR(50)    NOT NULL COMMENT 'Trạng thái cư trú',
    issue_date         VARCHAR(50)    NULL     COMMENT 'Ngày cấp CCCD',
    issue_place        VARCHAR(255)   NULL     COMMENT 'Nơi cấp CCCD',
    previous_residence VARCHAR(500)   NULL     COMMENT 'Nơi cư trú trước đây',
    alias              VARCHAR(50)    NULL     COMMENT 'Bí danh',
    birth_place        VARCHAR(255)   NULL     COMMENT 'Nơi sinh',
    relationship_to_head VARCHAR(100)  NULL     COMMENT 'Quan hệ với chủ hộ',
    household_id       VARCHAR(50)    NULL,
    FOREIGN KEY (household_id) REFERENCES household(id)
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
-- 5.1. UTILITY_RECORD_HISTORY (Lịch sử chỉnh sửa số điện nước)
-- ============================================================
CREATE TABLE IF NOT EXISTS utility_record_history (
    id                  VARCHAR(50)     PRIMARY KEY,
    household_id        VARCHAR(50)     NOT NULL,
    period_id           VARCHAR(50)     NOT NULL,
    type                VARCHAR(50)     NOT NULL COMMENT 'WATER, ELECTRICITY, etc.',
    old_index_before    INT             NOT NULL,
    new_index_before    INT             NOT NULL,
    old_index_after     INT             NOT NULL,
    new_index_after     INT             NOT NULL,
    modified_by         VARCHAR(100)    NOT NULL COMMENT 'Tài khoản thực hiện sửa',
    modified_at         DATETIME        NOT NULL,
    
    FOREIGN KEY (household_id) REFERENCES household(id),
    FOREIGN KEY (period_id)    REFERENCES collection_period(id)
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
-- 7. VEHICLE (Xe cộ)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle (
    id                  VARCHAR(50)     PRIMARY KEY,
    plate_number        VARCHAR(50)     NOT NULL UNIQUE COMMENT 'Biển số xe',
    type                VARCHAR(50)     NOT NULL COMMENT 'MOTORCYCLE, CAR, etc.',
    owner_name          VARCHAR(255)    NOT NULL COMMENT 'Tên chủ xe',
    registration_date   DATE            NOT NULL COMMENT 'Ngày đăng ký gửi xe',
    household_id        VARCHAR(50)     NOT NULL,
    
    FOREIGN KEY (household_id) REFERENCES household(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. ACTIVITY_LOG (Nhật ký hoạt động & Kiểm thử)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id           VARCHAR(50)   PRIMARY KEY,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor        VARCHAR(100)  NOT NULL,
    action       VARCHAR(50)   NOT NULL,
    target_type  VARCHAR(100)  NOT NULL,
    target_id    VARCHAR(100)  NOT NULL,
    detail       VARCHAR(1000) NOT NULL,
    data_before  TEXT          NULL,
    data_after   TEXT          NULL,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DỮ LIỆU MẪU (để test)
-- ============================================================

-- Sample Users
-- Admin: admin / admin123 (hash bằng BCrypt)
-- Mật khẩu mặc định là admin123, hash: $2a$10$wN1QjMv.PzL/tZ6hJ7V7u.2q/30Hq03.95Yv/Z4XpP7/4k/xO/7jK
INSERT IGNORE INTO users (id, username, password_hash, full_name, role, status) VALUES
('USR001', 'admin', '$2a$10$wN1QjMv.PzL/tZ6hJ7V7u.2q/30Hq03.95Yv/Z4XpP7/4k/xO/7jK', 'Administrator', 'ADMIN', 'ACTIVE');

-- Sample Households
INSERT IGNORE INTO household (id, owner_name, members_count, area, motorcycle_count, car_count, apartment_no, floor, phone, status, note) VALUES
('HH001', 'Nguyen Van An',  3, 65.5, 1, 0, 'A1201', 12, '0987654321', 'OCCUPIED', 'Completed permanent residence registration.'),
('HH002', 'Tran Thi Binh',  2, 80.0, 2, 1, 'B0805', 8, '0911222333', 'OCCUPIED', 'One temporary resident.'),
('HH003', 'Le Van Cuong',   0, 50.0, 1, 0, 'C0302', 3, '0901111222', 'VACANT', 'Ready for handover.'),
('HH004', 'Pham Thi Dung',  0, 90.0, 0, 1, 'D0405', 4, '0909090909', 'OCCUPIED', NULL),
('HH005', 'Hoang Van Emin', 0, 45.0, 1, 0, 'E0501', 5, '0977000111', 'TEMPORARILY_AWAY', NULL);

-- Sample Residents
INSERT IGNORE INTO resident (id, full_name, gender, date_of_birth, identity_no, phone, hometown, occupation, status, relationship_to_head, household_id) VALUES
('RES001', 'Nguyen Van An', 'Male', '1985-04-12', '001085000111', '0987654321', 'Hanoi', 'Engineer', 'PERMANENT', 'Head', 'HH001'),
('RES002', 'Le Thu Ha', 'Female', '1988-08-20', '001188000222', '0977000111', 'Hanoi', 'Teacher', 'PERMANENT', 'Spouse', 'HH001'),
('RES003', 'Nguyen Minh Quan', 'Male', '2015-05-15', '001215000333', NULL, 'Hanoi', 'Student', 'PERMANENT', 'Child', 'HH001'),
('RES004', 'Tran Thi Binh', 'Female', '1979-01-15', '031079000333', '0911222333', 'Nam Dinh', 'Accountant', 'PERMANENT', 'Head', 'HH002'),
('RES005', 'Pham Minh Duc', 'Male', '1998-11-02', '022098000444', '0909090909', 'Hai Phong', 'Student', 'TEMPORARY', 'Tenant', 'HH002');

-- Sample Fees
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

-- Sample Collection Periods
INSERT IGNORE INTO collection_period (id, name, status, created_at) VALUES
('PER001', 'May 2025 Cycle', 'OPEN',   NOW()),
('PER002', 'April 2025 Cycle', 'CLOSED', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- Sample Utility Records
INSERT IGNORE INTO utility_record (id, household_id, period_id, type, old_index, new_index) VALUES
('UT001', 'HH001', 'PER001', 'WATER', 100, 115), -- Consumption = 15
('UT002', 'HH002', 'PER001', 'WATER', 200, 220), -- Consumption = 20
('UT003', 'HH003', 'PER001', 'WATER', 150, 160); -- Consumption = 10

-- Sample Assigned Fees (UNPAID, PAID, and PARTIAL)
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

-- Sample Receipts (matching PAID and PARTIAL assignments above)
INSERT IGNORE INTO receipt (id, assigned_fee_id, amount_paid, paid_at, note, created_by) VALUES
('RC001', 'AF004', 1200000.00, NOW(),                          'Bank Transfer', 'admin'),
('RC002', 'AF005',  288000.00, NOW(),                          NULL,            'admin'),
('RC003', 'AF009',  144000.00, NOW(),                          'Cash',          'admin'),
('RC004', 'AF012',  982500.00, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL,            'admin'),
('RC005', 'AF013',  216000.00, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL,            'admin'),
('RCP01', 'AF002',  100000.00, NOW(),                          'Partial Payment Test', 'admin');

-- Sample Vehicles
INSERT IGNORE INTO vehicle (id, plate_number, type, owner_name, registration_date, household_id) VALUES
('VH001', '29A-12345', 'MOTORCYCLE', 'Nguyen Van An', '2025-05-10', 'HH001'),
('VH002', '30E-99999', 'CAR',        'Tran Thi Binh', '2025-04-15', 'HH002'),
('VH003', '29B-56789', 'MOTORCYCLE', 'Tran Thi Binh', '2025-04-16', 'HH002'),
('VH004', '29C-11111', 'MOTORCYCLE', 'Tran Thi Binh', '2025-04-17', 'HH002'),
('VH005', '29D-22222', 'MOTORCYCLE', 'Le Van Cuong',   '2025-05-12', 'HH003');
