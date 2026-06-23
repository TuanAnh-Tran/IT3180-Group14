/**
 * DB.JS — Legacy compatibility shim
 * ApartmentDB giờ gọi về Backend REST API thông qua api.js.
 * Giữ file này để không break các import cũ.
 */
import { UsersAPI, LogsAPI, AuthAPI } from './api.js';

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class ApartmentDB {
  static async init() { /* no-op: backend handles init */ }

  static async getUsers()             { return await UsersAPI.getAll(); }
  static async getUserByUsername(u)   { return await UsersAPI.getOne(u).catch(() => null); }
  static async createUser(data)       { return await UsersAPI.create(data); }
  static async deleteUser(u, op)      { return await UsersAPI.delete(u); }
  static async updateUserRole(u, r)   { return await UsersAPI.updateRole(u, r); }
  static async changePassword(u, pw)  { return await UsersAPI.resetPassword(u, pw); }
  static async updateProfile(u, d)    { return await AuthAPI.updateProfile(d); }

  static async getLogs()              { return await LogsAPI.getAll(); }
  static async addLog(username, action, type) {
    // Logs are written server-side; no-op on client
    return { username, action, type, timestamp: new Date().toISOString() };
  }
}
