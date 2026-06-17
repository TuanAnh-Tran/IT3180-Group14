/**
 * USER MODEL — CRUD cho collection users
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { readCollection, writeCollection } = require('../utils/database');
const Log = require('./Log');

const COLLECTION = 'users';

class User {
  /** Lấy tất cả users (bỏ passwordHash) */
  static findAll() {
    return readCollection(COLLECTION).map(u => this._sanitize(u));
  }

  /** Lấy raw user (có passwordHash) — chỉ dùng nội bộ */
  static _findRaw(username) {
    return readCollection(COLLECTION).find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  /** Tìm user theo username (public, không có hash) */
  static findByUsername(username) {
    const u = this._findRaw(username);
    return u ? this._sanitize(u) : null;
  }

  /** Tìm user theo id */
  static findById(id) {
    const u = readCollection(COLLECTION).find(u => u.id === id);
    return u ? this._sanitize(u) : null;
  }

  /** Validate required fields */
  static validate(data, isUpdate = false) {
    const required = [
      'fullname', 'phone', 'room',
      'householdCode', 'householdHeadName', 'houseNo', 'street', 'ward', 'district',
      'alias', 'dob', 'birthPlace', 'hometown', 'ethnicity', 'occupation', 'workplace',
      'identityNo', 'issueDate', 'issuePlace', 'previousResidence'
    ];
    if (!isUpdate) required.push('username');

    for (const field of required) {
      const val = data[field];
      if (!val || String(val).trim() === '') {
        throw Object.assign(new Error(`Missing required field: ${field}`), { status: 400 });
      }
    }

    if (!/^\d+$/.test(String(data.phone).trim())) {
      throw Object.assign(new Error('Phone number must contain digits only.'), { status: 400 });
    }
    if (!/^\d+$/.test(String(data.identityNo).trim())) {
      throw Object.assign(new Error('Citizen ID must contain digits only.'), { status: 400 });
    }
  }

  /** Tạo user mới */
  static async create(data, operator = 'system') {
    this.validate(data, false);

    const users = readCollection(COLLECTION);

    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw Object.assign(new Error('Username already exists!'), { status: 409 });
    }
    if (users.some(u => u.identityNo === data.identityNo.trim())) {
      throw Object.assign(new Error('Citizen ID already registered to another account!'), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password || 'user123', 10);

    const newUser = {
      id: uuidv4(),
      username: data.username.toLowerCase().trim(),
      fullname: data.fullname.trim(),
      role: data.role || 'user',
      room: data.room.trim(),
      phone: data.phone.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      householdCode: data.householdCode.trim(),
      householdHeadName: data.householdHeadName.trim(),
      houseNo: data.houseNo.trim(),
      street: data.street.trim(),
      ward: data.ward.trim(),
      district: data.district.trim(),
      alias: data.alias.trim(),
      dob: data.dob.trim(),
      birthPlace: data.birthPlace.trim(),
      hometown: data.hometown.trim(),
      ethnicity: data.ethnicity.trim(),
      occupation: data.occupation.trim(),
      workplace: data.workplace.trim(),
      identityNo: data.identityNo.trim(),
      issueDate: data.issueDate.trim(),
      issuePlace: data.issuePlace.trim(),
      previousResidence: data.previousResidence.trim()
    };

    users.push(newUser);
    writeCollection(COLLECTION, users);

    await Log.add(operator, `Created new resident account: @${newUser.username} (${newUser.fullname})`, 'success');

    return this._sanitize(newUser);
  }

  /** Xóa user */
  static async delete(username, operator) {
    if (username.toLowerCase() === 'admin') {
      throw Object.assign(new Error('Cannot delete the root System Administrator!'), { status: 403 });
    }
    if (username.toLowerCase() === operator.toLowerCase()) {
      throw Object.assign(new Error('You cannot delete your own account!'), { status: 403 });
    }

    let users = readCollection(COLLECTION);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw Object.assign(new Error('User not found!'), { status: 404 });

    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    writeCollection(COLLECTION, users);

    await Log.add(operator, `Deleted user account: @${username}`, 'warning');
    return true;
  }

  /** Cập nhật role */
  static async updateRole(username, newRole, operator) {
    if (username.toLowerCase() === 'admin') {
      throw Object.assign(new Error('Cannot modify the root System Administrator role!'), { status: 403 });
    }

    const users = readCollection(COLLECTION);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw Object.assign(new Error('User not found!'), { status: 404 });

    const oldRole = user.role;
    user.role = newRole;
    writeCollection(COLLECTION, users);

    await Log.add(operator, `Changed @${username}'s role from ${oldRole} to ${newRole}`, 'info');
    return this._sanitize(user);
  }

  /** Đổi mật khẩu */
  static async changePassword(username, newPassword, operator) {
    const users = readCollection(COLLECTION);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw Object.assign(new Error('User not found!'), { status: 404 });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    writeCollection(COLLECTION, users);

    await Log.add(operator, `Changed password for account: @${username}`, 'info');
    return true;
  }

  /** Cập nhật profile */
  static async updateProfile(username, data, operator) {
    this.validate(data, true);

    const users = readCollection(COLLECTION);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw Object.assign(new Error('User not found!'), { status: 404 });

    // Kiểm tra CCCD trùng (ngoại trừ chính user đang sửa)
    if (data.identityNo.trim() !== user.identityNo) {
      if (users.some(u => u.username.toLowerCase() !== username.toLowerCase() && u.identityNo === data.identityNo.trim())) {
        throw Object.assign(new Error('Citizen ID already registered to another account!'), { status: 409 });
      }
    }

    Object.assign(user, {
      fullname: data.fullname.trim(),
      phone: data.phone.trim(),
      room: data.room.trim(),
      householdCode: data.householdCode.trim(),
      householdHeadName: data.householdHeadName.trim(),
      houseNo: data.houseNo.trim(),
      street: data.street.trim(),
      ward: data.ward.trim(),
      district: data.district.trim(),
      alias: data.alias.trim(),
      dob: data.dob.trim(),
      birthPlace: data.birthPlace.trim(),
      hometown: data.hometown.trim(),
      ethnicity: data.ethnicity.trim(),
      occupation: data.occupation.trim(),
      workplace: data.workplace.trim(),
      identityNo: data.identityNo.trim(),
      issueDate: data.issueDate.trim(),
      issuePlace: data.issuePlace.trim(),
      previousResidence: data.previousResidence.trim()
    });

    writeCollection(COLLECTION, users);
    await Log.add(operator, `Updated profile for @${username}`, 'info');
    return this._sanitize(user);
  }

  /** Xác thực mật khẩu */
  static async verifyPassword(username, password) {
    const user = this._findRaw(username);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? this._sanitize(user) : null;
  }

  /** Bỏ passwordHash khi trả về client */
  static _sanitize(u) {
    const { passwordHash, ...safe } = u;
    return safe;
  }
}

module.exports = User;
