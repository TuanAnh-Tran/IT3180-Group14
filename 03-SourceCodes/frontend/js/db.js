/**
 * CƠ SỞ DỮ LIỆU GIẢ LẬP TRÊN TRÌNH DUYỆT (LocalStorage Database)
 * Tích hợp mã hóa mật khẩu an toàn với Web Crypto API (SHA-256).
 * Mọi giải thích nghiệp vụ và kỹ thuật được ghi bằng Tiếng Việt.
 */

// Hàm băm mật khẩu bằng thuật toán SHA-256 thông qua Web Crypto API
// Kết quả trả về là chuỗi Hex 64 ký tự (bảo mật tuyệt đối, không lưu plain text)
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  // Thực hiện băm bất đồng bộ bằng SubtleCrypto của trình duyệt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Chuyển đổi mảng byte sang dạng chuỗi Hexadecimal thường dùng
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Khai báo các khóa (Keys) dùng để lưu trữ dữ liệu trong LocalStorage
const STORAGE_KEYS = {
  USERS: 'apartment_mgmt_users',
  LOGS: 'apartment_mgmt_logs',
  INITIALIZED: 'apartment_mgmt_initialized'
};

export class ApartmentDB {
  /**
   * Khởi tạo cơ sở dữ liệu giả lập với dữ liệu mẫu (Seed Data)
   * Chạy duy nhất một lần khi khởi chạy ứng dụng lần đầu tiên.
   */
  static async init() {
    // Nếu cơ sở dữ liệu đã từng được khởi tạo, bỏ qua
    if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      return;
    }

    console.log('Initializing local mock database with English seed data...');
    
    // Tạo danh sách tài khoản mẫu ban đầu (Hiển thị tên Tiếng Anh)
    const seedUsers = [
      {
        username: 'admin',
        fullname: 'System Administrator',
        role: 'admin',
        room: 'BQL-01',
        phone: '0941234567',
        passwordHash: await hashPassword('admin123'),
        createdAt: new Date().toISOString(),
        householdCode: 'HH-ADMIN',
        householdHeadName: 'System Admin',
        houseNo: '1',
        street: 'Tech Street',
        ward: 'Cyber Ward',
        district: 'Cyberspace District',
        alias: 'Admin',
        dob: '1990-01-01',
        birthPlace: 'Hanoi',
        hometown: 'Hanoi',
        ethnicity: 'Kinh',
        occupation: 'SysAdmin',
        workplace: 'Management Office',
        identityNo: '001000000001',
        issueDate: '2015-05-05',
        issuePlace: 'Police Dept',
        previousResidence: 'Hanoi'
      },
      {
        username: 'accountant',
        fullname: 'Financial Accountant',
        role: 'accountant',
        room: 'TC-01',
        phone: '0949999888',
        passwordHash: await hashPassword('accountant123'),
        createdAt: new Date().toISOString(),
        householdCode: 'HH-ACCOUNTANT',
        householdHeadName: 'Financial Accountant',
        houseNo: 'TC-01',
        street: 'Tech Street',
        ward: 'Cyber Ward',
        district: 'Cyberspace District',
        alias: 'Accountant',
        dob: '1992-02-02',
        birthPlace: 'Hanoi',
        hometown: 'Hanoi',
        ethnicity: 'Kinh',
        occupation: 'Accountant',
        workplace: 'Management Office',
        identityNo: '001000000002',
        issueDate: '2016-06-06',
        issuePlace: 'Police Dept',
        previousResidence: 'Hanoi'
      },
      {
        username: 'resident1',
        fullname: 'Michael Scott',
        role: 'user',
        room: 'A1201',
        phone: '0912345678',
        passwordHash: await hashPassword('user123'),
        createdAt: new Date().toISOString(),
        householdCode: 'HH-A1201',
        householdHeadName: 'Michael Scott',
        houseNo: 'A1201',
        street: 'BlueMoon Street',
        ward: 'Me Tri Ward',
        district: 'Nam Tu Liem District',
        alias: 'Mike',
        dob: '1985-04-12',
        birthPlace: 'Scranton',
        hometown: 'Hanoi',
        ethnicity: 'Kinh',
        occupation: 'Manager',
        workplace: 'Dunder Mifflin',
        identityNo: '001085000111',
        issueDate: '2016-06-12',
        issuePlace: 'Police Dept',
        previousResidence: 'Pennsylvania'
      },
      {
        username: 'pam',
        fullname: 'Pam Beesly',
        role: 'user',
        room: 'A1201',
        phone: '0977000111',
        passwordHash: await hashPassword('user123'),
        createdAt: new Date().toISOString(),
        householdCode: 'HH-A1201',
        householdHeadName: 'Michael Scott',
        houseNo: 'A1201',
        street: 'BlueMoon Street',
        ward: 'Me Tri Ward',
        district: 'Nam Tu Liem District',
        alias: 'Pam',
        dob: '1988-08-20',
        birthPlace: 'Scranton',
        hometown: 'Hanoi',
        ethnicity: 'Kinh',
        occupation: 'Receptionist',
        workplace: 'Dunder Mifflin',
        identityNo: '001188000222',
        issueDate: '2018-08-20',
        issuePlace: 'Police Dept',
        previousResidence: 'Pennsylvania'
      },
      {
        username: 'resident2',
        fullname: 'Jim Halpert',
        role: 'user',
        room: 'B0805',
        phone: '0987654321',
        passwordHash: await hashPassword('user123'),
        createdAt: new Date().toISOString(),
        householdCode: 'HH-B0805',
        householdHeadName: 'Jim Halpert',
        houseNo: 'B0805',
        street: 'BlueMoon Street',
        ward: 'Me Tri Ward',
        district: 'Nam Tu Liem District',
        alias: 'Jim',
        dob: '1979-01-15',
        birthPlace: 'Philadelphia',
        hometown: 'Nam Dinh',
        ethnicity: 'Kinh',
        occupation: 'Sales',
        workplace: 'Dunder Mifflin',
        identityNo: '031079000333',
        issueDate: '2017-07-15',
        issuePlace: 'Police Dept',
        previousResidence: 'Philadelphia'
      },
      {
        username: 'dwight',
        fullname: 'Dwight Schrute',
        role: 'user',
        room: 'B0805',
        phone: '0909090909',
        passwordHash: await hashPassword('user123'),
        createdAt: new Date().toISOString(),
        householdCode: 'HH-B0805',
        householdHeadName: 'Jim Halpert',
        houseNo: 'B0805',
        street: 'BlueMoon Street',
        ward: 'Me Tri Ward',
        district: 'Nam Tu Liem District',
        alias: 'Dwight',
        dob: '1998-11-02',
        birthPlace: 'Scranton',
        hometown: 'Hanoi',
        ethnicity: 'Kinh',
        occupation: 'Assistant to the Regional Manager',
        workplace: 'Dunder Mifflin',
        identityNo: '022098000444',
        issueDate: '2018-11-02',
        issuePlace: 'Police Dept',
        previousResidence: 'Pennsylvania'
      }
    ];

    // Tạo nhật ký hệ thống mẫu ban đầu (Nội dung Tiếng Anh)
    const seedLogs = [
      {
        id: 'log_1',
        username: 'system',
        action: 'System database initialized successfully',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        type: 'info'
      },
      {
        id: 'log_2',
        username: 'admin',
        action: 'Administrator logged into the portal',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'success'
      }
    ];

    // Đồng bộ ghi mảng dữ liệu mẫu vào LocalStorage dưới dạng chuỗi JSON
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seedUsers));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(seedLogs));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  /* ==========================================================================
     PHẦN 1: CÁC PHƯƠNG THỨC QUẢN LÝ NGƯỜI DÙNG (USER CRUD CONTROLLER)
     ========================================================================== */

  /**
   * Lấy toàn bộ danh sách người dùng đã được lưu trong LocalStorage
   */
  static async getUsers() {
    await this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  }

  /**
   * Tìm kiếm thông tin người dùng theo tên đăng nhập (Không phân biệt chữ hoa/thường)
   */
  static async getUserByUsername(username) {
    const users = await this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  /**
   * Kiểm tra tính hợp lệ của thông tin cư dân.
   */
  static validateUserData(userData, isUpdate = false) {
    const requiredFields = [
      'fullname', 'phone', 'room',
      'householdCode', 'householdHeadName', 'houseNo', 'street', 'ward', 'district',
      'alias', 'dob', 'birthPlace', 'hometown', 'ethnicity', 'occupation', 'workplace',
      'identityNo', 'issueDate', 'issuePlace', 'previousResidence'
    ];
    
    if (!isUpdate) {
      requiredFields.push('username');
    }

    for (const field of requiredFields) {
      const val = userData[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        throw new Error(`All fields are required and cannot be left blank! (Missing/empty: ${field})`);
      }
    }

    const phone = String(userData.phone).trim();
    if (!/^0\d{9}$/.test(phone)) {
      throw new Error('Phone number must start with 0 and contain exactly 10 digits!');
    }

    const identityNo = String(userData.identityNo).trim();
    if (!/^\d{12}$/.test(identityNo)) {
      throw new Error('Citizen ID (CCCD) must contain exactly 12 digits!');
    }
  }

  /**
   * Tạo tài khoản cư dân mới.
   * RÀNG BUỘC QUAN TRỌNG: Kiểm tra và ngăn chặn tuyệt đối việc đăng ký trùng Username & CCCD!
   */
  static async createUser(userData) {
    const users = await this.getUsers();
    
    // Check if it's self-registration
    const isSelfRegistration = userData.creator === userData.username;
    
    if (!isSelfRegistration) {
      this.validateUserData(userData, false);
    } else {
      // Validate minimal fields for self-registration
      if (!userData.username || !userData.fullname || !userData.phone || !userData.identityNo) {
        throw new Error('Username, Full Name, Phone, and Citizen ID (CCCD) are required!');
      }
      const phone = String(userData.phone).trim();
      if (!/^0\d{9}$/.test(phone)) {
        throw new Error('Phone number must start with 0 and contain exactly 10 digits!');
      }
      const identityNo = String(userData.identityNo).trim();
      if (!/^\d{12}$/.test(identityNo)) {
        throw new Error('Citizen ID (CCCD) must contain exactly 12 digits!');
      }
    }

    // Kiểm tra tính duy nhất của Username
    const exists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) {
      throw new Error('Username already exists!');
    }

    // Kiểm tra tính duy nhất của CCCD
    if (userData.identityNo) {
      const cccdExists = users.some(u => u.identityNo === userData.identityNo.trim());
      if (cccdExists) {
        throw new Error('Citizen ID (CCCD) already registered to another account!');
      }
    }

    // Băm mật khẩu mặc định (mặc định là user123 nếu không truyền)
    const passwordHash = await hashPassword(userData.password || 'user123');

    // Khởi tạo thực thể người dùng mới
    const newUser = {
      username: userData.username.toLowerCase().trim(),
      fullname: userData.fullname ? userData.fullname.trim() : 'New Resident',
      role: userData.role || 'user',
      room: userData.room ? userData.room.trim() : 'No Room Assigned',
      phone: userData.phone ? userData.phone.trim() : '0000000000',
      passwordHash: passwordHash,
      createdAt: new Date().toISOString(),
      
      // Household info
      householdCode: userData.householdCode ? userData.householdCode.trim() : `HH-${userData.room || 'TEMP'}`,
      householdHeadName: userData.householdHeadName ? userData.householdHeadName.trim() : (userData.fullname || 'N/A'),
      houseNo: userData.houseNo ? userData.houseNo.trim() : (userData.room || 'N/A'),
      street: userData.street ? userData.street.trim() : 'N/A',
      ward: userData.ward ? userData.ward.trim() : 'N/A',
      district: userData.district ? userData.district.trim() : 'N/A',
      
      // Resident info
      alias: userData.alias ? userData.alias.trim() : 'N/A',
      dob: userData.dob ? userData.dob.trim() : '1990-01-01',
      birthPlace: userData.birthPlace ? userData.birthPlace.trim() : 'N/A',
      hometown: userData.hometown ? userData.hometown.trim() : 'N/A',
      ethnicity: userData.ethnicity ? userData.ethnicity.trim() : 'Kinh',
      occupation: userData.occupation ? userData.occupation.trim() : 'N/A',
      workplace: userData.workplace ? userData.workplace.trim() : 'N/A',
      identityNo: userData.identityNo ? userData.identityNo.trim() : '000000000000',
      issueDate: userData.issueDate ? userData.issueDate.trim() : '2020-01-01',
      issuePlace: userData.issuePlace ? userData.issuePlace.trim() : 'Police Dept',
      previousResidence: userData.previousResidence ? userData.previousResidence.trim() : 'N/A'
    };

    // Đẩy vào mảng và cập nhật lại LocalStorage
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Ghi nhận nhật ký thao tác bằng Tiếng Anh
    await this.addLog(userData.creator || 'admin', `Created new resident account: @${newUser.username} (${newUser.fullname})`, 'success');

    return newUser;
  }

  /**
   * Xóa một tài khoản cư dân khỏi hệ thống.
   * RÀNG BUỘC BẢO MẬT: Không thể tự xóa chính mình và không thể xóa tài khoản root 'admin'.
   */
  static async deleteUser(username, operator) {
    if (username.toLowerCase() === 'admin') {
      throw new Error('Cannot delete the root System Administrator (admin)!');
    }

    if (username.toLowerCase() === operator.toLowerCase()) {
      throw new Error('You cannot delete your own account!');
    }

    let users = await this.getUsers();
    const userToDelete = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!userToDelete) {
      throw new Error('User account not found!');
    }

    // Lọc bỏ tài khoản cần xóa và ghi đè lại LocalStorage
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Ghi nhận nhật ký xóa
    await this.addLog(operator, `Deleted user account: @${username}`, 'warning');
    return true;
  }

  /**
   * Thay đổi quyền (Role) của người dùng (Admin chỉ định)
   */
  static async updateUserRole(username, newRole, operator) {
    if (username.toLowerCase() === 'admin') {
      throw new Error('Cannot modify the role of the root System Administrator (admin)!');
    }

    const users = await this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      throw new Error('User not found!');
    }

    const oldRole = user.role;
    user.role = newRole;

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Ghi nhật ký phân quyền bằng tiếng Anh
    await this.addLog(operator, `Changed @${username}'s role from ${oldRole} to ${newRole}`, 'info');
    return user;
  }

  /**
   * Thay đổi mật khẩu người dùng
   */
  static async changePassword(username, newPassword, operator) {
    const users = await this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      throw new Error('User not found!');
    }

    // Băm mật khẩu mới trước khi lưu
    user.passwordHash = await hashPassword(newPassword);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Ghi nhận nhật ký đổi mật khẩu
    await this.addLog(operator, `Changed password for account: @${username}`, 'info');
    return true;
  }

  /**
   * Cập nhật thông tin chi tiết hồ sơ cá nhân
   */
  static async updateProfile(username, details, operator) {
    const users = await this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      throw new Error('User not found!');
    }

    // Validate details
    this.validateUserData(details, true);

    // If CCCD is being changed, check uniqueness
    if (details.identityNo.trim() !== user.identityNo) {
      const cccdExists = users.some(u => u.username.toLowerCase() !== username.toLowerCase() && u.identityNo === details.identityNo.trim());
      if (cccdExists) {
        throw new Error('Citizen ID (CCCD/CMND) already registered to another account!');
      }
    }

    user.fullname = details.fullname.trim();
    user.phone = details.phone.trim();
    user.room = details.room.trim();
    
    // Household info
    user.householdCode = details.householdCode.trim();
    user.householdHeadName = details.householdHeadName.trim();
    user.houseNo = details.houseNo.trim();
    user.street = details.street.trim();
    user.ward = details.ward.trim();
    user.district = details.district.trim();
    
    // Resident info
    user.alias = details.alias.trim();
    user.dob = details.dob.trim();
    user.birthPlace = details.birthPlace.trim();
    user.hometown = details.hometown.trim();
    user.ethnicity = details.ethnicity.trim();
    user.occupation = details.occupation.trim();
    user.workplace = details.workplace.trim();
    user.identityNo = details.identityNo.trim();
    user.issueDate = details.issueDate.trim();
    user.issuePlace = details.issuePlace.trim();
    user.previousResidence = details.previousResidence.trim();

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Ghi nhật ký cập nhật hồ sơ
    await this.addLog(operator, `Updated profile details for @${username}`, 'info');
    return user;
  }

  /* ==========================================================================
     PHẦN 2: CÁC PHƯƠNG THỨC GHI NHẬT KÝ HỆ THỐNG (ACTIVITY LOGS CONTROLLER)
     ========================================================================== */

  /**
   * Lấy toàn bộ danh sách nhật ký hệ thống
   */
  static async getLogs() {
    await this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
  }

  /**
   * Thêm một dòng nhật ký hệ thống mới (Giới hạn tối đa 50 bản ghi gần nhất)
   */
  static async addLog(username, action, type = 'info') {
    const logs = await this.getLogs();
    const newLog = {
      id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
      username,
      action,
      timestamp: new Date().toISOString(),
      type
    };

    logs.unshift(newLog); // Đưa bản ghi mới lên vị trí đầu tiên (Mới nhất)
    
    // Nếu số lượng vượt quá 50, loại bỏ dòng nhật ký cũ nhất ở cuối mảng
    if (logs.length > 50) {
      logs.pop();
    }

    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return newLog;
  }
}
