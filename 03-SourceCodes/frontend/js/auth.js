

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

    try {
      // Call Spring Boot Backend
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Incorrect username or password!');
      }

      const sessionUser = await res.json(); // AuthResponse

      // Lưu thông tin phiên đăng nhập hiện tại vào sessionStorage
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      
      return sessionUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Đăng xuất người dùng.
   * Xóa thông tin Session hiện tại khỏi bộ nhớ trình duyệt.
   */
  static async logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * Lấy thông tin tài khoản đang đăng nhập trong phiên làm việc hiện tại
   */
  static getCurrentUser() {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (e) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  /**
   * Kiểm tra xem người dùng đã đăng nhập hay chưa (Xác thực trạng thái)
   */
  static isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  /**
   * Đăng ký tài khoản cư dân mới từ màn hình public.
   * Tự động kiểm tra trùng lặp tên đăng nhập thông qua API.
   */
  static async register(username, email, fullname, room, phone, identityNo, password, adminSecret = '') {
    if (!username || !email || !fullname || !identityNo || !password) {
      throw new Error('Please fill in all required fields (Username, Email, Full Name, Citizen ID (CCCD), Password)!');
    }

    if (username.length < 4) {
      throw new Error('Username must be at least 4 characters long!');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long!');
    }

    // Call Backend API using API object instead of direct fetch here (we added it to api.js)
    // Wait, since api.js might not be imported in auth.js, we should import it or fetch directly
    // Let's use direct fetch to avoid circular dependency if api.js imports auth.js
    const res = await fetch('http://localhost:8080/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, fullname, room, phone, identityNo, password, adminSecret })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Registration failed!');
    }

    return true; // Registration successful
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

    // Call Backend API
    const tokenStr = sessionStorage.getItem('apartment_mgmt_session');
    let token = null;
    if (tokenStr) {
      try {
        const sessionObj = JSON.parse(tokenStr);
        token = sessionObj.token || sessionObj;
        if (typeof token === 'object') token = token.token;
      } catch (e) { }
    }

    const res = await fetch('http://localhost:8080/api/auth/change-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ currentPassword: oldPassword, newPassword })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to change password');
    }

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

    const tokenStr = sessionStorage.getItem(SESSION_KEY);
    let token = null;
    if (tokenStr) {
      try {
        const sessionObj = JSON.parse(tokenStr);
        token = sessionObj.token || sessionObj;
        if (typeof token === 'object') token = token.token;
      } catch (e) { }
    }

    const res = await fetch('http://localhost:8080/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(details)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to update profile details');
    }

    const updatedUser = await res.json();

    // Cập nhật lại thông tin Session hiện tại trong sessionStorage
    const updatedSession = {
      ...currentUser,
      fullname: updatedUser.fullname,
      room: updatedUser.room,
      phone: updatedUser.phone,
      identityNo: updatedUser.identityNo || ''
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    
    return updatedSession;
  }

  static async getProfile() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Your session has expired!');
    }

    const tokenStr = sessionStorage.getItem(SESSION_KEY);
    let token = null;
    if (tokenStr) {
      try {
        const sessionObj = JSON.parse(tokenStr);
        token = sessionObj.token || sessionObj;
        if (typeof token === 'object') token = token.token;
      } catch (e) { }
    }

    const res = await fetch('http://localhost:8080/api/auth/profile', {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to fetch profile details');
    }

    return await res.json();
  }

  static async requestPasswordReset(email) {
    if (!email) throw new Error('Email is required!');
    const res = await fetch('http://localhost:8080/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to request password reset');
    }
    return await res.text();
  }

  static async resetPassword(email, otp, newPassword) {
    if (!email || !otp || !newPassword) throw new Error('All fields are required!');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters!');
    const res = await fetch('http://localhost:8080/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to reset password');
    }
    return await res.text();
  }
}
