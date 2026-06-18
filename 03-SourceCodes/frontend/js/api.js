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
      const res = await fetch(`${API_BASE}/statistics/overview`, { method: 'GET', signal: AbortSignal.timeout(1500) });
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
    
    // Spring Security Auth: giả lập gửi username là admin khi gọi API (permitAll)
    const finalOptions = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
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
     1. PAYMENTS (Thu phí & Ghi nhận nộp tiền)
     ───────────────────────────────────────────── */

  /**
   * Lấy danh sách phí chưa thanh toán (GET /api/payments/unpaid).
   */
  async getUnpaidFees(periodId = '', householdId = '') {
    const params = new URLSearchParams();
    if (periodId) params.append('periodId', periodId);
    if (householdId) params.append('householdId', householdId);
    // Lấy size lớn để hiển thị đầy đủ danh sách phân trang phía client
    params.append('size', '1000'); 
    return this.fetchJson(`/payments/unpaid?${params.toString()}`);
  },

  /**
   * Ghi nhận nộp tiền (POST /api/payments).
   */
  async recordPayment(assignedFeeId, amountPaid, note = '') {
    return this.fetchJson('/payments', {
      method: 'POST',
      body: JSON.stringify({
        assignedFeeId,
        amountPaid: Number(amountPaid),
        note
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
      // Định dạng ngày thành LocalDateTime chuẩn ISO (yyyy-MM-ddTHH:mm:ss)
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

  /**
   * Đường dẫn xuất báo cáo Excel
   */
  getExportUrl(type, param1 = '', param2 = '') {
    if (type === 'period-receipts') {
      return `${API_BASE}/reports/receipts/by-period/${param1}`;
    }
    if (type === 'date-receipts') {
      return `${API_BASE}/reports/receipts/by-date?from=${param1}T00:00:00&to=${param2}T23:59:59`;
    }
    if (type === 'period-debt') {
      return `${API_BASE}/reports/debt/by-period/${param1}`;
    }
    return '';
  }
};
