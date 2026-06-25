const memory = {
  users: [],
  logs: [],
  initialized: false
};

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export class ApartmentDB {
  static async init() {
    memory.initialized = true;
  }

  static async getUsers() {
    return [...memory.users];
  }

  static async createUser(userData) {
    const user = {
      id: userData.id || `USR-${Date.now()}`,
      username: userData.username,
      fullname: userData.fullname || userData.fullName || '',
      fullName: userData.fullName || userData.fullname || '',
      email: userData.email || '',
      room: userData.room || '',
      phone: userData.phone || '',
      role: userData.role || 'user',
      status: userData.status || 'PENDING',
      identityNo: userData.identityNo || '',
      createdAt: new Date().toISOString()
    };
    memory.users = [user, ...memory.users.filter(item => item.username !== user.username)];
    await this.addLog(userData.creator || 'system', `Created account @${user.username}`, 'success');
    return user;
  }

  static async deleteUser(username, operator = 'system') {
    memory.users = memory.users.filter(user => user.username !== username);
    await this.addLog(operator, `Deleted account @${username}`, 'warning');
  }

  static async updateRole(username, newRole, operator = 'system') {
    const user = memory.users.find(item => item.username === username);
    if (!user) throw new Error('User not found');
    user.role = newRole;
    await this.addLog(operator, `Changed @${username} role to ${newRole}`, 'info');
    return user;
  }

  static async changePassword(username, _newPassword, operator = 'system') {
    await this.addLog(operator, `Changed password for @${username}`, 'info');
    return true;
  }

  static async updateProfile(username, details, operator = 'system') {
    const user = memory.users.find(item => item.username === username);
    if (!user) throw new Error('User not found');
    Object.assign(user, details);
    await this.addLog(operator, `Updated profile for @${username}`, 'info');
    return user;
  }

  static async getLogs() {
    return [...memory.logs];
  }

  static async addLog(username, action, type = 'info') {
    memory.logs.unshift({
      id: `LOG-${Date.now()}`,
      username,
      action,
      type,
      timestamp: new Date().toISOString()
    });
    memory.logs = memory.logs.slice(0, 50);
  }
}
