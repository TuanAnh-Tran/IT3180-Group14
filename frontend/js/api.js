/**
 * API.JS — Lớp API Client giao tiếp với Java Spring Boot Backend
 * Cung cấp các phương thức gọi REST API với cơ chế kiểm tra kết nối (Backend Health Check).
 */

const API_BASE = 'http://localhost:8080/api';

export const API = {
  /**
   * Kiểm tra kết nối tới backend.
   * Trả về true nếu backend đang hoạt động, false nếu offline.
   */
  async checkHealth() {
    try {
      const tokenStr = sessionStorage.getItem('apartment_mgmt_session');
      let token = null;
      if (tokenStr) {
        try {
          const sessionObj = JSON.parse(tokenStr);
          token = sessionObj.token || sessionObj;
          if (typeof token === 'object') token = token.token;
        } catch (e) { }
      }
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/statistics/overview`, { 
        method: 'GET', 
        headers,
        signal: AbortSignal.timeout(1500) 
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Thực hiện cuộc gọi API chuẩn.
   */
  async fetchJson(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = { 'Content-Type': 'application/json' };
    
    // Include JWT token if available
    const tokenStr = sessionStorage.getItem('apartment_mgmt_session');
    let token = null;
    if (tokenStr) {
      try {
        const sessionObj = JSON.parse(tokenStr);
        token = sessionObj.token || sessionObj;
        if (typeof token === 'object') token = token.token;
      } catch (e) { }
    }

    const finalOptions = {
      ...options,
      headers: { 
        ...defaultHeaders, 
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const res = await fetch(url, finalOptions);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `API Error: ${res.status}`);
    }
    const result = await res.json();
    return result.data; // Trả về trường 'data' từ ApiResponse wrapper
  },

  /* ─────────────────────────────────────────────
     AUTH & USERS (Tài khoản & Phân quyền)
     ───────────────────────────────────────────── */

  async register(username, email, fullname, room, phone, identityNo, password, adminSecret = '') {
    return this.fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, fullname, room, phone, identityNo, password, adminSecret })
    });
  },

  async requestPasswordReset(email) {
    return this.fetchJson('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(email, otp, newPassword) {
    return this.fetchJson('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
  },

  async getUsers() {
    return this.fetchJson('/users');
  },

  async createUser(userData) {
    return this.fetchJson('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUserRole(username, role) {
    return this.fetchJson(`/users/${username}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  },

  async approveUser(username) {
    return this.fetchJson(`/users/${username}/approve`, { method: 'PUT' });
  },

  async unlockUser(username) {
    return this.fetchJson(`/users/${username}/unlock`, { method: 'PUT' });
  },

  async deleteUser(username) {
    return this.fetchJson(`/users/${username}`, { method: 'DELETE' });
  },

  /* ─────────────────────────────────────────────
     1. PAYMENTS (Thu phí & Ghi nhận nộp tiền)
     ───────────────────────────────────────────── */

  /**
   * Lấy danh sách phí chưa thanh toán (GET /api/payments/unpaid).
   */
  async getUnpaidFees(periodId = '', householdId = '') {
    const params = new URLSearchParams();
    if (periodId) params.append('periodId', periodId);
    if (householdId) params.append('householdId', householdId);
    params.append('size', '1000');
    return this.fetchJson(`/payments/unpaid?${params.toString()}`);
  },

  /**
   * Ghi nhận nộp tiền (POST /api/payments).
   */
  async recordPayment(assignedFeeId, amountPaid, note = '') {
    const parsedAmount = Number(amountPaid);
    const finalAmount = (isNaN(parsedAmount) || parsedAmount <= 0) ? null : parsedAmount;
    return this.fetchJson('/payments', {
      method: 'POST',
      body: JSON.stringify({
        assignedFeeId,
        amountPaid: finalAmount,
        note
      })
    });
  },

  /**
   * Cập nhật chỉ số điện/nước và ghi nhận lịch sử thay đổi (POST /api/utility-records/update).
   */
  async updateUtilityIndex(householdId, periodId, feeId, oldIndex, newIndex) {
    return this.fetchJson('/utility-records/update', {
      method: 'POST',
      body: JSON.stringify({
        householdId,
        periodId,
        feeId,
        oldIndex: Number(oldIndex),
        newIndex: Number(newIndex)
      })
    });
  },

  /**
   * Lấy danh sách phí theo đợt thu (GET /api/payments/by-period/{periodId})
   */
  async getFeesByPeriod(periodId) {
    return this.fetchJson(`/payments/by-period/${periodId}?size=1000`);
  },

  /* ─────────────────────────────────────────────
     2. RECEIPTS (Lịch sử biên lai)
     ───────────────────────────────────────────── */

  /**
   * Lấy lịch sử biên lai đóng phí (GET /api/receipts)
   */
  async getReceiptHistory(householdId = '', from = '', to = '') {
    const params = new URLSearchParams();
    if (householdId) params.append('householdId', householdId);
    if (from) {
      params.append('from', from + 'T00:00:00');
    }
    if (to) {
      params.append('to', to + 'T23:59:59');
    }
    params.append('size', '1000');
    return this.fetchJson(`/receipts?${params.toString()}`);
  },

  /**
   * Lấy chi tiết một biên lai theo ID (GET /api/receipts/{id})
   */
  async getReceiptById(id) {
    return this.fetchJson(`/receipts/${id}`);
  },

  /* ─────────────────────────────────────────────
     3. STATISTICS & REPORTS (Thống kê & Báo cáo)
     ───────────────────────────────────────────── */

  /**
   * Lấy thống kê tổng quan (GET /api/statistics/overview)
   */
  async getOverview() {
    return this.fetchJson('/statistics/overview');
  },

  /**
   * Lấy thống kê theo đợt (GET /api/statistics/by-period/{periodId})
   */
  async getByPeriod(periodId) {
    return this.fetchJson(`/statistics/by-period/${periodId}`);
  },

  /**
   * Lấy doanh thu theo tháng (GET /api/statistics/monthly?year={year})
   */
  async getMonthlyRevenue(year) {
    return this.fetchJson(`/statistics/monthly?year=${year}`);
  },

  /**
   * Lấy doanh thu theo loại phí (GET /api/statistics/by-fee-type)
   */
  async getRevenueByFeeType() {
    return this.fetchJson('/statistics/by-fee-type');
  },

  async getResidentStats() {
    return this.fetchJson('/residents/stats');
  },

  async getDemographicsTrend(year) {
    return this.fetchJson(`/residents/stats/trend?year=${year}`);
  },

  async getContributions() {
    return this.fetchJson('/statistics/contributions');
  },

  async cancelReceipt(receiptId) {
    return this.fetchJson(`/payments/${receiptId}/cancel`, { method: 'POST' });
  },

  async getQrUrl(assignedFeeId) {
    return this.fetchJson(`/payments/qr/${assignedFeeId}`);
  },

  async submitProof(assignedFeeId, amount, proofImage = '', note = '', transactionId = '', payerName = '') {
    const params = new URLSearchParams({
      assignedFeeId,
      amount: amount.toString(),
      proofImage,
      note,
      transactionId,
      payerName
    });
    return this.fetchJson(`/payments/proof?${params.toString()}`, { method: 'POST' });
  },

  async getPendingProofs() {
    return this.fetchJson('/payments/proof/pending');
  },

  async approveProof(proofId, note = '') {
    const params = new URLSearchParams();
    if (note) params.append('note', note);
    return this.fetchJson(`/payments/proof/${proofId}/approve?${params.toString()}`, { method: 'POST' });
  },

  async rejectProof(proofId, note = '') {
    const params = new URLSearchParams();
    if (note) params.append('note', note);
    return this.fetchJson(`/payments/proof/${proofId}/reject?${params.toString()}`, { method: 'POST' });
  },

  /**
   * Lấy danh sách lịch sử sửa đổi chỉ số điện nước (GET /api/utility-records/history).
   */
  async getUtilityHistory() {
    return this.fetchJson('/utility-records/history');
  },

  /**
   * Secure Excel export using fetch and Blobs
   */
  async exportExcel(type, param1 = '', param2 = '') {
    let url = '';
    if (type === 'period-receipts') {
      url = `${API_BASE}/reports/receipts/by-period/${param1}`;
    } else if (type === 'date-receipts') {
      url = `${API_BASE}/reports/receipts/by-date?from=${param1}T00:00:00&to=${param2}T23:59:59`;
    } else if (type === 'period-debt') {
      url = `${API_BASE}/reports/debt/by-period/${param1}`;
    }
    if (!url) return;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /* ─────────────────────────────────────────────
     4. VEHICLES (Quản lý xe chi tiết)
     ───────────────────────────────────────────── */

  /**
   * Tìm kiếm xe cộ phân trang (GET /api/vehicles).
   */
  async searchVehicles(plateNumber = '', type = '', householdId = '', page = 0, size = 10) {
    const params = new URLSearchParams();
    if (plateNumber) params.append('plateNumber', plateNumber.trim());
    if (type && type !== 'ALL') params.append('type', type.trim());
    if (householdId) params.append('householdId', householdId.trim());
    params.append('page', String(page));
    params.append('size', String(size));
    return this.fetchJson(`/vehicles?${params.toString()}`);
  },

  /**
   * Lấy danh sách xe của hộ gia đình (GET /api/vehicles/household/{householdId}).
   */
  async getVehiclesByHousehold(householdId) {
    return this.fetchJson(`/vehicles/household/${householdId}`);
  },

  /**
   * Lưu thông tin xe (POST /api/vehicles).
   */
  async saveVehicle(vehicleData) {
    return this.fetchJson('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
  },

  /**
   * Xóa thông tin xe (DELETE /api/vehicles/{id}).
   */
  async deleteVehicle(id) {
    return this.fetchJson(`/vehicles/${id}`, {
      method: 'DELETE'
    });
  },

  /* ─────────────────────────────────────────────
     5. FEES (Quản lý khoản phí)
     ───────────────────────────────────────────── */

  /**
   * Lấy toàn bộ danh sách khoản phí (GET /api/fees).
   */
  async getFees() {
    return this.fetchJson('/fees');
  },

  /**
   * Lưu thông tin khoản phí (POST /api/fees).
   */
  async saveFee(feeData) {
    return this.fetchJson('/fees', {
      method: 'POST',
      body: JSON.stringify(feeData)
    });
  },

  /**
   * Xóa khoản phí theo ID (DELETE /api/fees/{id}).
   */
  async deleteFee(id) {
    return this.fetchJson(`/fees/${id}`, {
      method: 'DELETE'
    });
  },

  /* ─────────────────────────────────────────────
     6. PERIODS (Quản lý đợt thu phí)
     ───────────────────────────────────────────── */

  /**
   * Lấy toàn bộ danh sách đợt thu phí (GET /api/payments/periods).
   */
  async getPeriods() {
    return this.fetchJson('/payments/periods');
  },

  /**
   * Tạo mới một đợt thu phí và tự động gán phí (POST /api/payments/periods).
   */
  async createPeriod(name, feeIds) {
    return this.fetchJson('/payments/periods', {
      method: 'POST',
      body: JSON.stringify({ name, feeIds })
    });
  },

  /**
   * Đóng một đợt thu phí (POST /api/payments/periods/{id}/close).
   */
  async closePeriod(id) {
    return this.fetchJson(`/payments/periods/${id}/close`, {
      method: 'POST'
    });
  },

  async reopenPeriod(id) {
    return this.fetchJson(`/payments/periods/${id}/reopen`, {
      method: 'POST'
    });
  },

  /**
   * Lấy toàn bộ danh sách hộ gia đình từ backend (GET /api/residents/households).
   */
  async getHouseholds() {
    return this.fetchJson('/residents/households?size=1000');
  },

  /* ─────────────────────────────────────────────
     7. NOTIFICATIONS (Quản lý thông báo)
     ───────────────────────────────────────────── */

  async getNotifications() {
    return this.fetchJson('/notifications');
  },

  async markAllNotificationsRead() {
    return this.fetchJson('/notifications/mark-read', { method: 'PUT' });
  },

  async markNotificationRead(id) {
    return this.fetchJson(`/notifications/${id}/read`, { method: 'PUT' });
  }
};