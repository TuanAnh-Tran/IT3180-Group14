import { API } from '../api.js';

/**
 * THÀNH PHẦN BẢNG TỔNG QUAN (Dashboard Component)
 * Hiển thị thẻ thống số, biểu đồ cột thu phí bằng SVG tự vẽ và lịch sử nhật ký.
 * Giao diện hiển thị Tiếng Anh, chú thích bằng Tiếng Việt.
 */
export class Dashboard {
  static async render(container, user) {
    const isAdmin = user.role === 'admin';
    const isAccountant = user.role === 'accountant';

    let logs = [];
    let totalUsers = 0;
    let residentCount = 0;
    let residentStats = {
      totalHouseholds: 0,
      totalResidents: 0,
      occupiedHouseholds: 0,
      vacantHouseholds: 0,
      permanentResidents: 0,
      temporaryResidents: 0
    };
    let overviewStats = null;
    let monthlyRevenue = {};

    // Load available data safely based on user role permissions
    try {
      if (isAdmin) {
        const users = await API.getUsers();
        totalUsers = users.length;
        residentCount = users.filter(u => u.role === 'user').length;
      }
    } catch (e) {
      console.warn('Failed to fetch system users', e);
    }

    try {
      const statsData = await API.fetchJson('/residents/stats');
      if (statsData) {
        residentStats = { ...residentStats, ...statsData };
      }
    } catch (e) {
      console.warn('Failed to fetch resident stats', e);
    }

    try {
      if (isAdmin || isAccountant) {
        const overviewData = await API.getOverview();
        if (overviewData) {
          overviewStats = { ...overviewStats, ...overviewData };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch overview stats', e);
    }

    try {
      const activityData = await API.fetchJson('/residents/activity');
      if (activityData) {
        logs = activityData;
      }
    } catch (e) {
      console.warn('Failed to fetch activity logs', e);
    }

    try {
      if (isAdmin || isAccountant) {
        const monthlyData = await API.getMonthlyRevenue(new Date().getFullYear());
        if (monthlyData && monthlyData.monthlyRevenue) {
          monthlyRevenue = monthlyData.monthlyRevenue;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch monthly revenue', e);
    }

    // Dynamic Chart Data Calculation
    const currentMonthNum = new Date().getMonth() + 1; // 1-12
    
    const getMonthName = (mNum) => {
      const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return names[(mNum - 1 + 12) % 12];
    };

    const getMonthVal = (mNum) => {
      const val = monthlyRevenue[`Month ${mNum}`] || 0;
      return Number(val) / 1000000; // in Millions VND
    };

    const m3 = currentMonthNum;
    const m2 = (currentMonthNum - 1) || 12;
    const m1 = (currentMonthNum - 2) || (currentMonthNum - 2 + 12);

    const val1 = getMonthVal(m1);
    const val2 = getMonthVal(m2);
    const val3 = getMonthVal(m3);

    // scale reference is at least 10M, max computed from monthly values
    const maxVal = Math.max(val1, val2, val3, 10);
    const h1 = (val1 / maxVal) * 140;
    const h2 = (val2 / maxVal) * 140;
    const h3 = (val3 / maxVal) * 140;

    const y1 = 180 - h1;
    const y2 = 180 - h2;
    const y3 = 180 - h3;

    // Vẽ biểu đồ cột trực tiếp bằng mã SVG (Glassmorphic Bar Chart)
    const svgChart = `
      <svg viewBox="0 0 500 220" class="svg-chart" style="width: 100%; height: 100%; font-family: inherit;">
        <!-- Vẽ các đường lưới ngang (Grid Lines) để dễ ước lượng số liệu -->
        <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
        <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
        <line x1="40" y1="130" x2="480" y2="130" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
        <line x1="40" y1="180" x2="480" y2="180" stroke="rgba(255,255,255,0.1)" />

        <!-- Hiển thị các nhãn giá trị dọc trục Y (Y-Axis Labels) -->
        <text x="30" y="35" fill="var(--text-muted)" font-size="10" text-anchor="end">${Math.round(maxVal)}M</text>
        <text x="30" y="85" fill="var(--text-muted)" font-size="10" text-anchor="end">${Math.round(maxVal * 0.6)}M</text>
        <text x="30" y="135" fill="var(--text-muted)" font-size="10" text-anchor="end">${Math.round(maxVal * 0.2)}M</text>
        <text x="30" y="185" fill="var(--text-muted)" font-size="10" text-anchor="end">0</text>

        <!-- Cột Month 1 -->
        <rect x="70" y="${y1}" width="30" height="${h1}" rx="4" fill="rgba(99, 102, 241, 0.4)" stroke="var(--color-primary)" stroke-width="1.5" />
        <text x="85" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">${getMonthName(m1)}</text>
        <text x="85" y="${y1 - 5}" fill="var(--text-primary)" font-size="9" text-anchor="middle">${val1.toFixed(1)}M</text>

        <!-- Cột Month 2 -->
        <rect x="170" y="${y2}" width="30" height="${h2}" rx="4" fill="rgba(99, 102, 241, 0.4)" stroke="var(--color-primary)" stroke-width="1.5" />
        <text x="185" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">${getMonthName(m2)}</text>
        <text x="185" y="${y2 - 5}" fill="var(--text-primary)" font-size="9" text-anchor="middle">${val2.toFixed(1)}M</text>

        <!-- Cột Month 3 -->
        <rect x="270" y="${y3}" width="30" height="${h3}" rx="4" fill="rgba(99, 102, 241, 0.4)" stroke="var(--color-primary)" stroke-width="1.5" />
        <text x="285" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">${getMonthName(m3)} (Current)</text>
        <text x="285" y="${y3 - 5}" fill="var(--text-primary)" font-size="9" text-anchor="middle">${val3.toFixed(1)}M</text>

        <!-- Chú thích ký hiệu biểu đồ (Legend) -->
        <circle cx="370" cy="15" r="5" fill="var(--color-primary)" />
        <text x="380" y="19" fill="var(--text-secondary)" font-size="10">Collected (M VND)</text>
      </svg>
    `;

    const collectedRate = overviewStats ? `${overviewStats.completionRate.toFixed(1)}%` : 'N/A';
    const unpaidCount = overviewStats ? overviewStats.unpaidHouseholds : 'N/A';

    // Xuất nội dung HTML giao diện Tiếng Anh vào Container chính
    container.innerHTML = `
      <div class="metrics-grid">
        <!-- Thẻ Thống kê 1: Tổng số căn hộ -->
        <div class="metric-card">
          <div class="metric-info">
            <h3>Total Households</h3>
            <div class="metric-value">${residentStats.totalHouseholds}</div>
            <div class="metric-desc">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px; color: var(--color-success);">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
              <span>${residentStats.occupiedHouseholds} occupied / ${residentStats.vacantHouseholds} vacant</span>
            </div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18" />
            </svg>
          </div>
        </div>

        <!-- Thẻ Thống kê 2: Tổng nhân khẩu -->
        <div class="metric-card accent">
          <div class="metric-info">
            <h3>Total Residents</h3>
            <div class="metric-value">${residentStats.totalResidents}</div>
            <div class="metric-desc">
              <span style="color: var(--color-accent); font-weight: bold;">+${residentCount || 0}</span>
              <span>registered portal accounts</span>
            </div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M14.214 16.058A9.366 9.366 0 0012 16c-2.115 0-4.078.697-5.666 1.874m8.88-1.816A8.88 8.88 0 0012 15c-1.92 0-3.693.61-5.13 1.648M12 11.25a3.375 3.375 0 100-6.75 3.375 3.375 0 000 6.75zm1.5-1.5a3.375 3.375 0 00-6.75 0 3.375 3.375 0 006.75 0z" />
            </svg>
          </div>
        </div>

        <!-- Thẻ Thống kê 3: Tỷ lệ thu phí -->
        <div class="metric-card success">
          <div class="metric-info">
            <h3>Fee Collection Rate</h3>
            <div class="metric-value">${collectedRate}</div>
            <div class="metric-desc">
              <span style="color: var(--color-success); font-weight: bold;">${unpaidCount} households</span>
              <span>remaining unpaid</span>
            </div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75m-.75-3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M3 3h18M3 21h18M12 6.75h.75m-.75 3h.75m-.75 3h.75m-3-6h.75m-.75 3h.75m-.75 3h.75" />
            </svg>
          </div>
        </div>

        <!-- Thẻ Thống kê 4: Tổng số tài khoản đăng nhập -->
        <div class="metric-card warning">
          <div class="metric-info">
            <h3>System Accounts</h3>
            <div class="metric-value">${totalUsers || (isAdmin ? 0 : 'N/A')}</div>
            <div class="metric-desc">
              <span>Role-based access authorized</span>
            </div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Khu vực vẽ Biểu đồ thu phí -->
        <div class="chart-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Annual Collection Progress</h2>
              <p class="card-title-muted">Comparison of the latest 3 billing cycles</p>
            </div>
            <div class="user-role">
              <span class="role-badge role-user" style="text-transform: none;">Unit: Million VND</span>
            </div>
          </div>
          <div class="svg-chart-container">
            ${svgChart}
          </div>
        </div>

        <!-- Khu vực hiển thị Nhật ký hoạt động hệ thống (System Activity Log) -->
        <div class="chart-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">System Activity Log</h2>
              <p class="card-title-muted">Recent operations executed on the system</p>
            </div>
          </div>
          <div class="activity-list">
            ${logs.map(log => {
              // Phân bổ lớp CSS tương thích với từng trạng thái nhật ký
              let typeClass = '';
              if (log.type === 'success') typeClass = 'success';
              else if (log.type === 'warning') typeClass = 'danger';
              else if (log.type === 'info') typeClass = 'info';

              // Định dạng thời gian rõ ràng (ví dụ: 14:30 25/05)
              const timeString = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ' + new Date(log.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
              
              return `
                <div class="activity-item ${typeClass}">
                  <div class="activity-dot"></div>
                  <div class="activity-details">
                    <div class="activity-text">
                      <strong>@${log.username}</strong>: ${log.action}
                    </div>
                    <div class="activity-time">${timeString}</div>
                  </div>
                </div>
              `;
            }).join('')}
            ${logs.length === 0 ? '<div class="card-title-muted" style="text-align: center; padding: 20px;">No recent activities found.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Khung chào mừng (Welcome Panel) mang lại cảm giác cao cấp -->
      <div class="chart-card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);">
        <h2 class="card-title" style="margin-bottom: 8px; color: var(--text-primary);">Welcome back, ${user.fullname}!</h2>
        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
          Welcome to the <strong>Cyberspace</strong> Resident Service and Administration Portal.
          ${isAdmin ? 'As a member of the <strong>Management Office (Admin)</strong>, you can manage resident accounts, assign system access permissions, and audit the complete activity logs of the system.' : (user.role === 'accountant' ? 'As a member of the <strong>Financial Office (Accountant)</strong>, you can view the statistics dashboard, create fees, manage billing periods, and record resident payments.' : 'As a registered <strong>Resident</strong> of unit <strong>' + user.room + '</strong>, you can view billing overviews, receive announcements, update your contact details, and change your password security.')}
        </p>
      </div>
    `;
  }
}
