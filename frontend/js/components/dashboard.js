import { API } from '../api.js';

/**
 * THÀNH PHẦN BẢNG TỔNG QUAN (Dashboard Component)
 * Hiển thị thẻ thống số, biểu đồ cột thu phí bằng SVG tự vẽ và lịch sử nhật ký.
 */
export class Dashboard {
  static async render(container, user) {
    const isBackend = await API.checkHealth();
    
    let logs = [];
    let residentCount = 0;
    let stats = {
      apartments: 0,
      collectedRate: '0%',
      unpaidCount: 0
    };
    let populationTrend = [];

    if (isBackend) {
      try {
        const resStats = await API.getResidentStats();
        const overview = await API.getOverview();
        
        stats.apartments = resStats.totalHouseholds;
        stats.collectedRate = overview.completionRate + '%';
        stats.unpaidCount = overview.unpaidHouseholds;
        residentCount = resStats.totalResidents;

        const apiLogs = await API.fetchJson('/residents/activity?limit=5');
        logs = apiLogs.map(l => ({
          username: l.actor,
          action: `${l.action} ${l.targetType}: ${l.detail}`,
          timestamp: l.createdAt,
          type: 'info'
        }));

        const currentYear = new Date().getFullYear();
        populationTrend = await API.getDemographicsTrend(currentYear);
      } catch (e) {
        console.error("Error loading backend dashboard metrics:", e);
      }
    }

    const isAdmin = user.role === 'admin';

    // Vẽ biểu đồ cột trực tiếp bằng mã SVG (Glassmorphic Bar Chart)
    const svgChart = `
      <svg viewBox="0 0 500 220" class="svg-chart" style="width: 100%; height: 100%; font-family: inherit;">
        <!-- Vẽ các đường lưới ngang (Grid Lines) để dễ ước lượng số liệu -->
        <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
        <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
        <line x1="40" y1="130" x2="480" y2="130" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
        <line x1="40" y1="180" x2="480" y2="180" stroke="rgba(255,255,255,0.1)" />

        <!-- Hiển thị các nhãn giá trị dọc trục Y (Y-Axis Labels) -->
        <text x="30" y="35" fill="var(--text-muted)" font-size="10" text-anchor="end">100M</text>
        <text x="30" y="85" fill="var(--text-muted)" font-size="10" text-anchor="end">50M</text>
        <text x="30" y="135" fill="var(--text-muted)" font-size="10" text-anchor="end">10M</text>
        <text x="30" y="185" fill="var(--text-muted)" font-size="10" text-anchor="end">0</text>

        <!-- Cột Month 1: March (Tháng 3) -->
        <rect x="70" y="80" width="30" height="100" rx="4" fill="rgba(99, 102, 241, 0.4)" stroke="var(--color-primary)" stroke-width="1.5" />
        <rect x="105" y="110" width="10" height="70" rx="2" fill="var(--color-accent)" opacity="0.8" />
        <text x="92" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">March</text>

        <!-- Cột Month 2: April (Tháng 4) -->
        <rect x="170" y="50" width="30" height="130" rx="4" fill="rgba(99, 102, 241, 0.4)" stroke="var(--color-primary)" stroke-width="1.5" />
        <rect x="205" y="70" width="10" height="110" rx="2" fill="var(--color-accent)" opacity="0.8" />
        <text x="192" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">April</text>

        <!-- Cột Month 3: May (Tháng 5 - Hiện tại) -->
        <rect x="270" y="40" width="30" height="140" rx="4" fill="rgba(99, 102, 241, 0.4)" stroke="var(--color-primary)" stroke-width="1.5" />
        <rect x="305" y="55" width="10" height="125" rx="2" fill="var(--color-accent)" opacity="0.8" />
        <text x="292" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">May (Current)</text>

        <!-- Chú thích ký hiệu biểu đồ (Legend) -->
        <circle cx="370" cy="15" r="5" fill="var(--color-primary)" />
        <text x="380" y="19" fill="var(--text-secondary)" font-size="10">Service Fee</text>
        
        <circle cx="370" cy="35" r="5" fill="var(--color-accent)" />
        <text x="380" y="39" fill="var(--text-secondary)" font-size="10">Utility & Parking</text>
      </svg>
    `;

    // Dynamic Population Fluctuation SVG
    let popChartSvg = '';
    if (populationTrend && populationTrend.length > 0) {
      const maxVal = Math.max(...populationTrend.map(t => Math.max(t.newResidents, t.temporaryAbsences, t.temporaryResidences)), 5);
      
      const pointsNew = [];
      const pointsAbs = [];
      const pointsRes = [];
      
      const width = 420;
      const height = 130;
      const xOffset = 50;
      const yOffset = 30;
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      let xLabels = '';
      populationTrend.forEach((t, i) => {
        const x = xOffset + (i * (width / 11));
        const yNew = yOffset + height - (t.newResidents / maxVal * height);
        const yAbs = yOffset + height - (t.temporaryAbsences / maxVal * height);
        const yRes = yOffset + height - (t.temporaryResidences / maxVal * height);
        
        pointsNew.push(`${x},${yNew}`);
        pointsAbs.push(`${x},${yAbs}`);
        pointsRes.push(`${x},${yRes}`);
        
        xLabels += `<text x="${x}" y="${yOffset + height + 18}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${months[t.month - 1]}</text>`;
      });
      
      popChartSvg = `
        <svg viewBox="0 0 500 200" class="svg-chart" style="width: 100%; height: 100%; font-family: inherit;">
          <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
          <line x1="40" y1="95" x2="480" y2="95" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
          <line x1="40" y1="160" x2="480" y2="160" stroke="rgba(255,255,255,0.1)" />

          <text x="30" y="34" fill="var(--text-muted)" font-size="9" text-anchor="end">${maxVal}</text>
          <text x="30" y="99" fill="var(--text-muted)" font-size="9" text-anchor="end">${Math.round(maxVal / 2)}</text>
          <text x="30" y="164" fill="var(--text-muted)" font-size="9" text-anchor="end">0</text>

          <polyline fill="none" stroke="var(--color-primary)" stroke-width="2.5" points="${pointsNew.join(' ')}" />
          <polyline fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="3" points="${pointsAbs.join(' ')}" />
          <polyline fill="none" stroke="var(--color-success)" stroke-width="2" points="${pointsRes.join(' ')}" />

          ${populationTrend.map((t, i) => {
            const x = xOffset + (i * (width / 11));
            const yNew = yOffset + height - (t.newResidents / maxVal * height);
            const yAbs = yOffset + height - (t.temporaryAbsences / maxVal * height);
            const yRes = yOffset + height - (t.temporaryResidences / maxVal * height);
            return `
              <circle cx="${x}" cy="${yNew}" r="3" fill="var(--color-primary)" />
              <circle cx="${x}" cy="${yAbs}" r="3" fill="var(--color-accent)" />
              <circle cx="${x}" cy="${yRes}" r="3" fill="var(--color-success)" />
            `;
          }).join('')}

          ${xLabels}
        </svg>
      `;
    }

    // Xuất nội dung HTML giao diện Tiếng Anh vào Container chính
    container.innerHTML = `
      <div class="dashboard-appear">
      <div class="metrics-grid">
        <!-- Thẻ Thống kê 1: Tổng số căn hộ -->
        <div class="metric-card dashboard-block" style="--dash-delay: 0ms;">
          <div class="metric-info">
            <h3>Total Apartments</h3>
            <div class="metric-value">${stats.apartments}</div>
            <div class="metric-desc">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px; color: var(--color-success);">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
              <span>100% Handed over</span>
            </div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18" />
            </svg>
          </div>
        </div>

        <!-- Thẻ Thống kê 2: Tổng nhân khẩu -->
        <div class="metric-card accent dashboard-block" style="--dash-delay: 80ms;">
          <div class="metric-info">
            <h3>Total Residents</h3>
            <div class="metric-value">${residentCount}</div>
            <div class="metric-desc">
              <span style="color: var(--color-accent); font-weight: bold;">Realtime DB</span>
              <span>registered records</span>
            </div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M14.214 16.058A9.366 9.366 0 0012 16c-2.115 0-4.078.697-5.666 1.874m8.88-1.816A8.88 8.88 0 0012 15c-1.92 0-3.693.61-5.13 1.648M12 11.25a3.375 3.375 0 100-6.75 3.375 3.375 0 000 6.75zm1.5-1.5a3.375 3.375 0 00-6.75 0 3.375 3.375 0 006.75 0z" />
            </svg>
          </div>
        </div>

        <!-- Thẻ Thống kê 3: Tỷ lệ thu phí -->
        <div class="metric-card success dashboard-block" style="--dash-delay: 160ms;">
          <div class="metric-info">
            <h3>Fee Collection Rate</h3>
            <div class="metric-value">${stats.collectedRate}</div>
            <div class="metric-desc">
              <span style="color: var(--color-success); font-weight: bold;">${stats.unpaidCount} households</span>
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
        <div class="metric-card warning dashboard-block" style="--dash-delay: 240ms;">
          <div class="metric-info">
            <h3>System Status</h3>
            <div class="metric-value">${isBackend ? 'ONLINE' : 'OFFLINE'}</div>
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
        <div class="chart-card dashboard-block" style="--dash-delay: 320ms;">
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
        <div class="chart-card dashboard-block" style="--dash-delay: 400ms;">
          <div class="card-header">
            <div>
              <h2 class="card-title">System Activity Log</h2>
              <p class="card-title-muted">Recent operations executed on the system</p>
            </div>
          </div>
          <div class="activity-list">
            ${logs.map(log => {
              let typeClass = '';
              if (log.type === 'success') typeClass = 'success';
              else if (log.type === 'warning') typeClass = 'danger';
              else if (log.type === 'info') typeClass = 'info';

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

        <!-- Biểu đồ Biến động dân cư (Population Fluctuations Trend) -->
        ${popChartSvg ? `
        <div class="chart-card dashboard-block" style="grid-column: span 2; --dash-delay: 480ms;">
          <div class="card-header">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
              <div>
                <h2 class="card-title">Population Fluctuations Trend</h2>
                <p class="card-title-muted">Monthly residency and registration variations for ${new Date().getFullYear()}</p>
              </div>
              <div style="display:flex; gap:12px; font-size:10px;">
                <span style="display:flex; align-items:center; gap:4px; color:var(--color-primary);">● New Residents</span>
                <span style="display:flex; align-items:center; gap:4px; color:var(--color-success);">● Temp Residences</span>
                <span style="display:flex; align-items:center; gap:4px; color:var(--color-accent);">╌╌ Temp Absences</span>
              </div>
            </div>
          </div>
          <div class="svg-chart-container" style="height: 220px; padding: 10px 0;">
            ${popChartSvg}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Khung chào mừng (Welcome Panel) mang lại cảm giác cao cấp -->
      <div class="chart-card dashboard-block" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); --dash-delay: 560ms;">
        <h2 class="card-title" style="margin-bottom: 8px; color: var(--text-primary);">Welcome back, ${user.fullname}!</h2>
        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
          Welcome to the <strong>Cyberspace</strong> Resident Service and Administration Portal.
          ${isAdmin ? 'As a member of the <strong>Management Office (Admin)</strong>, you can manage resident accounts, assign system access permissions, and audit the complete activity logs of the system.' : (user.role === 'accountant' ? 'As a member of the <strong>Financial Office (Accountant)</strong>, you can view the statistics dashboard, create fees, manage billing periods, and record resident payments.' : 'As a registered <strong>Resident</strong> of unit <strong>' + user.room + '</strong>, you can view billing overviews, receive announcements, update your contact details, and change your password security.')}
        </p>
      </div>
      </div>
    `;
  }
}
