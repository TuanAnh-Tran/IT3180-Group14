/**
 * API.JS — Frontend API Adapter
 * Kết nối frontend với backend REST API.
 * Thay thế hoàn toàn localStorage bằng các HTTP request thực.
 *
 * Tất cả các module frontend (auth.js, users.js, fees.js, payment.js, residents.js)
 * sẽ import từ file này thay vì dùng db.js trực tiếp.
 */

// ── Cấu hình ─────────────────────────────────────────────────
// Khi chạy qua Docker (Nginx phục vụ trên port 80/443 và proxy /api -> backend),
// dùng đường dẫn tương đối '/api'.
// Khi chạy local dev (Live Server, http-server, file://, ...) trên các port khác
// (5500, 5173, 8080, v.v.) hoặc mở trực tiếp file → gọi thẳng backend tại :3000.
const API_BASE = (() => {
  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') return 'http://localhost:3000/api';
  if (port === '' || port === '80' || port === '443') return '/api';
  return `${protocol}//${hostname}:3000/api`;
})();

// ── Token management ─────────────────────────────────────────
const TOKEN_KEY  = 'cyberspace_token';
const SESSION_KEY = 'apartment_mgmt_session';

export function getToken()        { return sessionStorage.getItem(TOKEN_KEY); }
export function setToken(t)       { sessionStorage.setItem(TOKEN_KEY, t); }
export function clearToken()      { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(SESSION_KEY); }

// ── HTTP helper ───────────────────────────────────────────────
async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

const get    = (path, auth) => request('GET', path, null, auth);
const post   = (path, body, auth) => request('POST', path, body, auth);
const put    = (path, body) => request('PUT', path, body);
const patch  = (path, body) => request('PATCH', path, body);
const del    = (path)       => request('DELETE', path);

// ════════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════════
export const AuthAPI = {
  async login(username, password) {
    const data = await post('/auth/login', { username, password }, false);
    setToken(data.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    return data.user;
  },

  async register(userData) {
    const data = await post('/auth/register', userData, false);
    setToken(data.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    return data.user;
  },

  async logout() {
    clearToken();
  },

  getCurrentUser() {
    const s = sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },

  isAuthenticated() {
    return !!getToken() && !!this.getCurrentUser();
  },

  async changePassword(oldPassword, newPassword) {
    await put('/auth/change-password', { oldPassword, newPassword });
    return true;
  },

  async updateProfile(details) {
    const data = await put('/auth/profile', details);
    setToken(data.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    return data.user;
  },

  async getMe() {
    const data = await get('/auth/me');
    return data.user;
  }
};

// ════════════════════════════════════════════════════════════
// USERS API (Admin)
// ════════════════════════════════════════════════════════════
export const UsersAPI = {
  async getAll()          { const d = await get('/users'); return d.data; },
  async getOne(username)  { const d = await get(`/users/${username}`); return d.data; },
  async create(data)      { const d = await post('/users', data); return d.data; },
  async update(username, data) { const d = await put(`/users/${username}`, data); return d.data; },
  async delete(username)  { return await del(`/users/${username}`); },
  async updateRole(username, role) { const d = await patch(`/users/${username}/role`, { role }); return d.data; },
  async resetPassword(username, newPassword) { return await patch(`/users/${username}/reset-password`, { newPassword }); }
};

// ════════════════════════════════════════════════════════════
// FEES API
// ════════════════════════════════════════════════════════════
export const FeesAPI = {
  // Khoản thu
  async getFees()           { const d = await get('/fees/fees'); return d.data; },
  async createFee(data)     { const d = await post('/fees/fees', data); return d.data; },
  async updateFee(id, data) { const d = await put(`/fees/fees/${id}`, data); return d.data; },
  async deleteFee(id)       { return await del(`/fees/fees/${id}`); },

  // Hộ gia đình
  async getHouseholds()       { const d = await get('/fees/households'); return d.data; },
  async getHousehold(id)      { const d = await get(`/fees/households/${id}`); return d.data; },
  async createHousehold(data) { const d = await post('/fees/households', data); return d.data; },
  async updateHousehold(id,data){ const d = await put(`/fees/households/${id}`, data); return d.data; },
  async deleteHousehold(id)   { return await del(`/fees/households/${id}`); },

  // Đợt thu
  async getPeriods()           { const d = await get('/fees/periods'); return d.data; },
  async getPeriod(id)          { const d = await get(`/fees/periods/${id}`); return d.data; },
  async createPeriod(data)     { const d = await post('/fees/periods', data); return d.data; },
  async updatePeriodStatus(id, status) { const d = await patch(`/fees/periods/${id}/status`, { status }); return d.data; },
  async getPeriodStats(id)     { const d = await get(`/fees/periods/${id}/stats`); return d.data; },

  // Phí gán
  async getAssigned(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const d  = await get(`/fees/assigned${qs ? '?' + qs : ''}`);
    return d.data;
  },
  async upsertAssigned(data)  { const d = await post('/fees/assigned', data); return d.data; },
  async deleteAssigned(id)    { return await del(`/fees/assigned/${id}`); }
};

// ════════════════════════════════════════════════════════════
// PAYMENTS API
// ════════════════════════════════════════════════════════════
export const PaymentsAPI = {
  async pay(assignedFeeId, amountPaid, note) {
    const d = await post('/payments', { assignedFeeId, amountPaid, note });
    return d.data;
  },
  async undo(assignedFeeId) { return await del(`/payments/${assignedFeeId}`); },
  async getReceipts(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const d  = await get(`/payments/receipts${qs ? '?' + qs : ''}`);
    return d.data;
  },
  async getStats() { const d = await get('/payments/stats'); return d.data; }
};

// ════════════════════════════════════════════════════════════
// RESIDENTS API (Nhân khẩu)
// ════════════════════════════════════════════════════════════
export const ResidentsAPI = {
  async getAll(householdId) {
    const qs = householdId ? `?householdId=${householdId}` : '';
    const d  = await get(`/residents${qs}`);
    return d.data;
  },
  async getOne(id)       { const d = await get(`/residents/${id}`); return d.data; },
  async create(data)     { const d = await post('/residents', data); return d.data; },
  async update(id, data) { const d = await put(`/residents/${id}`, data); return d.data; },
  async delete(id)       { return await del(`/residents/${id}`); }
};

// ════════════════════════════════════════════════════════════
// LOGS API (Admin)
// ════════════════════════════════════════════════════════════
export const LogsAPI = {
  async getAll() { const d = await get('/logs'); return d.data; }
};

// ════════════════════════════════════════════════════════════
// DASHBOARD — Tổng hợp dữ liệu cho dashboard
// ════════════════════════════════════════════════════════════
export const DashboardAPI = {
  async getSummary() {
    const [users, logs, periods] = await Promise.all([
      UsersAPI.getAll().catch(() => []),
      LogsAPI.getAll().catch(() => []),
      FeesAPI.getPeriods().catch(() => [])
    ]);

    // Lấy stats của period đang active
    let periodStats = null;
    const activePeriod = periods.find(p => p.status === 'ACTIVE');
    if (activePeriod) {
      periodStats = await FeesAPI.getPeriodStats(activePeriod.id).catch(() => null);
    }

    return { users, logs, periods, periodStats };
  }
};
