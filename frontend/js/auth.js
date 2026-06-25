import { ApartmentDB, hashPassword } from './db.js';

// Khóa dùng để lưu trữ thông tin phiên làm việc trong sessionStorage
const SESSION_KEY = 'apartment_mgmt_session';
const RESIDENTS_API_ROOT = window.RESIDENTS_API_ROOT || 'http://localhost:8080/api/residents';

function toSessionUser(user) {
  return {
    username: user.username,
    fullname: user.fullname,
    role: user.role,
    room: user.room,
    phone: user.phone,
    householdCode: user.householdCode || '',
    householdHeadName: user.householdHeadName || '',
    houseNo: user.houseNo || '',
    street: user.street || '',
    ward: user.ward || '',
    district: user.district || '',
    alias: user.alias || '',
    dob: user.dob || '',
    birthPlace: user.birthPlace || '',
    hometown: user.hometown || '',
    ethnicity: user.ethnicity || '',
    occupation: user.occupation || '',
    workplace: user.workplace || '',
    identityNo: user.identityNo || '',
    issueDate: user.issueDate || '',
    issuePlace: user.issuePlace || '',
    previousResidence: user.previousResidence || ''
  };
}

async function residentsApiJson(path, options = {}) {
  const response = await fetch(`${RESIDENTS_API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    let message = `Resident API failed with status ${response.status}`;
    try {
      const parsed = await response.json();
      message = parsed.message || message;
    } catch {
      // Keep status message.
    }
    throw new Error(message);
  }
  const payload = await response.json();
  return payload?.data ?? payload;
}

async function syncProfileToResident(previousUser, updatedUser, actor) {
  try {
    const oldIdentityNo = previousUser?.identityNo || '';
    const newIdentityNo = updatedUser.identityNo || '';
    if (!oldIdentityNo && !newIdentityNo) return;

    const search = encodeURIComponent(oldIdentityNo || newIdentityNo);
    const page = await residentsApiJson(`/residents?search=${search}&size=20`);
    const residents = page?.content || [];
    const resident = residents.find(item => item.identityNo === oldIdentityNo || item.identityNo === newIdentityNo) || residents[0] || null;

    const residentPayload = {
      fullName: updatedUser.fullname,
      gender: resident?.gender || 'Other',
      dateOfBirth: updatedUser.dob || resident?.dateOfBirth || null,
      identityNo: newIdentityNo,
      phone: updatedUser.phone || '',
      alias: updatedUser.alias || '',
      birthPlace: updatedUser.birthPlace || '',
      hometown: updatedUser.hometown || '',
      ethnicity: updatedUser.ethnicity || '',
      religion: resident?.religion || '',
      occupation: updatedUser.occupation || '',
      workplace: updatedUser.workplace || '',
      issueDate: updatedUser.issueDate || resident?.issueDate || null,
      issuePlace: updatedUser.issuePlace || '',
      previousResidence: updatedUser.previousResidence || '',
      relationshipToHead: resident?.relationshipToHead || '',
      status: resident?.status || 'PERMANENT',
      householdId: resident?.householdId || updatedUser.householdCode || '',
      alive: resident?.alive !== false,
      dateOfDeath: resident?.dateOfDeath || null
    };

    if (resident?.id) {
      await residentsApiJson(`/residents/${encodeURIComponent(resident.id)}?actor=${encodeURIComponent(actor)}`, {
        method: 'PUT',
        body: JSON.stringify(residentPayload)
      });
    } else if (residentPayload.householdId) {
      await residentsApiJson(`/residents?actor=${encodeURIComponent(actor)}`, {
        method: 'POST',
        body: JSON.stringify(residentPayload)
      });
    }

    if (resident?.householdId) {
      const household = await residentsApiJson(`/households/${encodeURIComponent(resident.householdId)}`);
      await residentsApiJson(`/households/${encodeURIComponent(resident.householdId)}?actor=${encodeURIComponent(actor)}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: household.id || household.code || resident.householdId,
          apartmentNo: household.apartmentNo || updatedUser.room || resident.householdId,
          floor: household.floor ?? 0,
          area: household.area ?? 0,
          headName: household.headName || household.ownerName || updatedUser.householdHeadName,
          headIdentityNo: household.headIdentityNo || '',
          phone: household.phone || updatedUser.phone || '',
          houseNo: updatedUser.houseNo || household.houseNo || '',
          street: updatedUser.street || household.street || '',
          ward: updatedUser.ward || household.ward || '',
          district: updatedUser.district || household.district || '',
          registrationDate: household.registrationDate || null,
          status: household.status || 'OCCUPIED',
          note: household.note || '',
          motorcycleCount: household.motorcycleCount ?? 0,
          carCount: household.carCount ?? 0
        })
      });
    }
  } catch (error) {
    console.warn('Profile saved locally, but resident sync was skipped:', error.message);
  }
}

export class AuthService {
  /**
   * Xử lý đăng nhập của người dùng.
   * Xác thực tài khoản dựa trên tên đăng nhập và mật khẩu qua backend thật.
   */
  static async login(username, password) {
    if (!username || !password) {
      throw new Error('Please fill in both username and password!');
    }

    const trimmedUsername = username.trim().toLowerCase();

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
   */
  static async register(username, email, fullname, room, phone, identityNo, password, adminSecret = '', role = 'user') {
    if (!username || !email || !fullname || !identityNo || !password) {
      throw new Error('Please fill in all required fields (Username, Email, Full Name, Citizen ID (CCCD), Password)!');
    }

    if (username.length < 4) {
      throw new Error('Username must be at least 4 characters long!');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long!');
    }

    const res = await fetch('http://localhost:8080/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, fullname, room, phone, identityNo, password, adminSecret, role })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Registration failed!');
    }

    try {
      const sessionUser = await res.json(); // If automatically approved
      if (sessionUser && sessionUser.token) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        return sessionUser;
      }
    } catch (e) {
      // Not JSON or no token, means pending approval
    }

    return null;
  }

  /**
   * Đổi mật khẩu cho tài khoản cư dân hiện tại đang đăng nhập.
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

    const tokenStr = sessionStorage.getItem(SESSION_KEY);
    let token = null;
    if (tokenStr) {
      try {
        const sessionObj = JSON.parse(tokenStr);
        token = sessionObj.token || sessionObj;
        if (typeof token === 'object') token = token.token;
      } catch (e) { }
    }

    if (!token) {
      throw new Error('Authentication token is missing. Please log in again.');
    }

    const res = await fetch('http://localhost:8080/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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

    if (!token) {
      throw new Error('Authentication token is missing. Please log in again.');
    }

    const res = await fetch('http://localhost:8080/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(details)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to update profile details');
    }

    const updatedUser = await res.json();
    const updatedSession = {
      ...currentUser,
      ...updatedUser,
      token: token // Keep the token
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));

    // Sync profile to Resident on backend if possible
    try {
      await syncProfileToResident(currentUser, updatedSession, currentUser.username);
    } catch (e) {}

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

    if (!token) {
      return currentUser;
    }

    const res = await fetch('http://localhost:8080/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
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
