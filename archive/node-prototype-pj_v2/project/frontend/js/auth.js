/**
 * AUTH.JS — Kết nối với Backend REST API
 * Thay thế LocalStorage bằng JWT token từ server.
 */
import { AuthAPI } from './api.js';

export class AuthService {
  static async login(username, password) {
    if (!username || !password) throw new Error('Please fill in both username and password!');
    return await AuthAPI.login(username.trim().toLowerCase(), password);
  }

  static async logout() {
    await AuthAPI.logout();
  }

  static getCurrentUser() {
    return AuthAPI.getCurrentUser();
  }

  static isAuthenticated() {
    return AuthAPI.isAuthenticated();
  }

  static async register(userData) {
    const { username, password } = userData;
    if (!username || !password) throw new Error('Please fill in all required fields!');
    if (username.length < 4) throw new Error('Username must be at least 4 characters long!');
    if (password.length < 6) throw new Error('Password must be at least 6 characters long!');
    return await AuthAPI.register(userData);
  }

  static async changePassword(oldPassword, newPassword) {
    if (!oldPassword || !newPassword) throw new Error('Please enter both old and new passwords!');
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters long!');
    if (oldPassword === newPassword) throw new Error('New password cannot be the same as old password!');
    return await AuthAPI.changePassword(oldPassword, newPassword);
  }

  static async updateProfile(details) {
    if (!details || !details.fullname) throw new Error('Full Name cannot be left blank!');
    return await AuthAPI.updateProfile(details);
  }
}
