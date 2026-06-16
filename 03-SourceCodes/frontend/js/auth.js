import { ApartmentDB, hashPassword } from './db.js';

// Khóa dùng để lưu trữ thông tin phiên làm việc trong sessionStorage
const SESSION_KEY = 'apartment_mgmt_session';

export class AuthService {
  /**
   * Xử lý đăng nhập của người dùng.
   * Xác thực tài khoản dựa trên tên đăng nhập và mật khẩu đã băm.
   */
  static async login(username, password) {
    if (!username || !password) {
      throw new Error('Please fill in both username and password!');
    }

    const trimmedUsername = username.trim().toLowerCase();
    const user = await ApartmentDB.getUserByUsername(trimmedUsername);
    
    // Nếu không tìm thấy user, trả về thông báo lỗi Tiếng Anh chung để tăng bảo mật
    if (!user) {
      throw new Error('Incorrect username or password!');
    }

    // Băm mật khẩu nhập vào và so khớp với passwordHash trong database
    const enteredHash = await hashPassword(password);
    if (enteredHash !== user.passwordHash) {
      throw new Error('Incorrect username or password!');
    }

    // Tạo thông tin Session an toàn để lưu vào bộ nhớ trình duyệt
    const sessionUser = {
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      room: user.room,
      phone: user.phone,
      identityNo: user.identityNo || ''
    };

    // Lưu thông tin phiên đăng nhập hiện tại vào sessionStorage
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    
    // Ghi nhận nhật ký hệ thống
    await ApartmentDB.addLog(user.username, 'Logged in successfully', 'success');

    return sessionUser;
  }

  /**
   * Đăng xuất người dùng.
   * Xóa thông tin Session hiện tại khỏi bộ nhớ trình duyệt.
   */
  static async logout() {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      await ApartmentDB.addLog(currentUser.username, 'Logged out of the system', 'info');
    }
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * Lấy thông tin tài khoản đang đăng nhập trong phiên làm việc hiện tại
   */
  static getCurrentUser() {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  /**
   * Kiểm tra xem người dùng đã đăng nhập hay chưa (Xác thực trạng thái)
   */
  static isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  /**
   * Đăng ký tài khoản cư dân mới từ màn hình public.
   * Tự động kiểm tra trùng lặp tên đăng nhập thông qua ApartmentDB.
   */
  static async register(username, fullname, room, phone, password) {
    if (!username || !fullname || !password) {
      throw new Error('Please fill in all required fields (Username, Full Name, Password)!');
    }

    if (username.length < 4) {
      throw new Error('Username must be at least 4 characters long!');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long!');
    }

    // Tiến hành tạo tài khoản. Hàm này sẽ ném ra lỗi "Username already exists!" nếu trùng lặp
    const newUser = await ApartmentDB.createUser({
      username,
      fullname,
      room,
      phone,
      password,
      creator: username // Người tạo chính là bản thân cư dân đăng ký
    });

    // Sau khi đăng ký thành công, tự động thiết lập phiên đăng nhập cho cư dân này
    const sessionUser = {
      username: newUser.username,
      fullname: newUser.fullname,
      role: newUser.role,
      room: newUser.room,
      phone: newUser.phone,
      identityNo: newUser.identityNo || ''
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  }

  /**
   * Đổi mật khẩu cho tài khoản cư dân hiện tại đang đăng nhập.
   * Thực hiện đối chiếu mật khẩu cũ và xác thực độ mạnh mật khẩu mới.
   */
  static async changePassword(oldPassword, newPassword) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Your session has expired. Please sign in again!');
    }

    if (!oldPassword || !newPassword) {
      throw new Error('Please enter both old and new passwords!');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long!');
    }

    if (oldPassword === newPassword) {
      throw new Error('New password cannot be the same as the old password!');
    }

    // Lấy thông tin đầy đủ của tài khoản từ Database
    const dbUser = await ApartmentDB.getUserByUsername(currentUser.username);
    
    // Băm và so sánh mật khẩu cũ nhập vào với cơ sở dữ liệu
    const oldHash = await hashPassword(oldPassword);
    if (oldHash !== dbUser.passwordHash) {
      throw new Error('Current password is incorrect!');
    }

    // Cập nhật mật khẩu băm mới vào cơ sở dữ liệu LocalStorage
    await ApartmentDB.changePassword(currentUser.username, newPassword, currentUser.username);
    return true;
  }

  /**
   * Cập nhật thông tin hồ sơ của tài khoản đang đăng nhập.
   */
  static async updateProfile(details) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Your session has expired!');
    }

    if (!details || !details.fullname) {
      throw new Error('Full Name cannot be left blank!');
    }

    // Cập nhật thông tin trong Database LocalStorage
    const updatedUser = await ApartmentDB.updateProfile(currentUser.username, details, currentUser.username);

    // Cập nhật lại thông tin Session hiện tại trong sessionStorage
    const updatedSession = {
      username: updatedUser.username,
      fullname: updatedUser.fullname,
      role: updatedUser.role,
      room: updatedUser.room,
      phone: updatedUser.phone,
      identityNo: updatedUser.identityNo || ''
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    
    return updatedSession;
  }
}
