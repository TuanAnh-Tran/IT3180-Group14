import { LogsAPI, UsersAPI, FeesAPI } from '../api.js';

export class Dashboard {
  static async render(container, user) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:300px;color:var(--text-muted);">Loading dashboard...</div>`;

    let logs = [], users = [], periodStats = null;
    try {
      [logs, users] = await Promise.all([
        user.role === 'admin' ? LogsAPI.getAll() : Promise.resolve([]),
        UsersAPI.getAll()
      ]);
      const periods = await FeesAPI.getPeriods().catch(() => []);
      const active  = periods.find(p => p.status === 'ACTIVE');
      if (active) periodStats = await FeesAPI.getPeriodStats(active.id).catch(() => null);
    } catch(e) { console.warn('Dashboard load error:', e.message); }

    const totalUsers    = users.length;
    const residentCount = users.filter(u => u.role === 'user').length;
    const isAdmin       = user.role === 'admin';
    const collectionRate = periodStats
      ? ((periodStats.paid / (periodStats.total || 1)) * 100).toFixed(1) + '%'
      : '—';
    const unpaidCount = periodStats ? periodStats.unpaid : '—';

    const svgChart = `
      <svg viewBox="0 0 500 220" style="width:100%;height:100%;font-family:inherit;">
        <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
        <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
        <line x1="40" y1="130" x2="480" y2="130" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
        <line x1="40" y1="180" x2="480" y2="180" stroke="rgba(255,255,255,0.1)"/>
        <text x="30" y="35" fill="var(--text-muted)" font-size="10" text-anchor="end">100M</text>
        <text x="30" y="85" fill="var(--text-muted)" font-size="10" text-anchor="end">50M</text>
        <text x="30" y="135" fill="var(--text-muted)" font-size="10" text-anchor="end">10M</text>
        <text x="30" y="185" fill="var(--text-muted)" font-size="10" text-anchor="end">0</text>
        <rect x="70"  y="80" width="30" height="100" rx="4" fill="rgba(99,102,241,0.4)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="105" y="110" width="10" height="70" rx="2" fill="var(--color-accent)" opacity="0.8"/>
        <text x="92" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">March</text>
        <rect x="170" y="50" width="30" height="130" rx="4" fill="rgba(99,102,241,0.4)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="205" y="70" width="10" height="110" rx="2" fill="var(--color-accent)" opacity="0.8"/>
        <text x="192" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">April</text>
        <rect x="270" y="40" width="30" height="140" rx="4" fill="rgba(99,102,241,0.4)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="305" y="55" width="10" height="125" rx="2" fill="var(--color-accent)" opacity="0.8"/>
        <text x="292" y="200" fill="var(--text-secondary)" font-size="11" text-anchor="middle">May (Current)</text>
        <circle cx="370" cy="15" r="5" fill="var(--color-primary)"/>
        <text x="380" y="19" fill="var(--text-secondary)" font-size="10">Service Fee</text>
        <circle cx="370" cy="35" r="5" fill="var(--color-accent)"/>
        <text x="380" y="39" fill="var(--text-secondary)" font-size="10">Utility &amp; Parking</text>
      </svg>`;

    container.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-info">
            <h3>Total Apartments</h3>
            <div class="metric-value">120</div>
            <div class="metric-desc"><span>100% Handed over</span></div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18"/></svg>
          </div>
        </div>
        <div class="metric-card accent">
          <div class="metric-info">
            <h3>Total Residents</h3>
            <div class="metric-value">${residentCount * 135 + 24}</div>
            <div class="metric-desc"><span style="color:var(--color-accent);font-weight:bold;">+${residentCount}</span> registered portal accounts</div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M14.214 16.058A9.366 9.366 0 0012 16c-2.115 0-4.078.697-5.666 1.874m8.88-1.816A8.88 8.88 0 0012 15c-1.92 0-3.693.61-5.13 1.648M12 11.25a3.375 3.375 0 100-6.75 3.375 3.375 0 000 6.75z"/></svg>
          </div>
        </div>
        <div class="metric-card success">
          <div class="metric-info">
            <h3>Fee Collection Rate</h3>
            <div class="metric-value">${collectionRate}</div>
            <div class="metric-desc"><span style="color:var(--color-success);font-weight:bold;">${unpaidCount} households</span> remaining unpaid</div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
        <div class="metric-card warning">
          <div class="metric-info">
            <h3>System Accounts</h3>
            <div class="metric-value">${totalUsers}</div>
            <div class="metric-desc"><span>Role-based access authorized</span></div>
          </div>
          <div class="metric-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="chart-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Annual Collection Progress</h2>
              <p class="card-title-muted">Comparison of latest 3 billing cycles</p>
            </div>
            <div class="user-role"><span class="role-badge role-user" style="text-transform:none;">Unit: Million VND</span></div>
          </div>
          <div class="svg-chart-container">${svgChart}</div>
        </div>

        ${isAdmin ? `
        <div class="chart-card">
          <div class="card-header">
            <div><h2 class="card-title">System Activity Log</h2><p class="card-title-muted">Recent operations</p></div>
          </div>
          <div class="activity-list">
            ${logs.map(log => {
              let cls = log.type === 'success' ? 'success' : log.type === 'warning' ? 'danger' : 'info';
              const t = new Date(log.timestamp);
              const ts = t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}) + ' ' + t.toLocaleDateString('en-US',{day:'2-digit',month:'2-digit'});
              return `<div class="activity-item ${cls}"><div class="activity-dot"></div><div class="activity-details"><div class="activity-text"><strong>@${log.username}</strong>: ${log.action}</div><div class="activity-time">${ts}</div></div></div>`;
            }).join('')}
            ${logs.length === 0 ? '<div class="card-title-muted" style="text-align:center;padding:20px;">No recent activities.</div>' : ''}
          </div>
        </div>
        ` : `
        <div class="chart-card">
          <div class="card-header"><div><h2 class="card-title">Announcements & Guidelines</h2><p class="card-title-muted">Building management updates</p></div></div>
          <div class="activity-list">
            <div class="activity-item info"><div class="activity-dot"></div><div class="activity-details"><div class="activity-text"><strong>Monthly Fees Due Date:</strong> Please settle all fees before the 10th of every month.</div><div class="activity-time">Important Notice</div></div></div>
            <div class="activity-item success"><div class="activity-dot"></div><div class="activity-details"><div class="activity-text"><strong>Management Hotline:</strong> For emergencies call <strong>024.1234.5678</strong>.</div><div class="activity-time">Contacts</div></div></div>
            <div class="activity-item info"><div class="activity-dot"></div><div class="activity-details"><div class="activity-text"><strong>Profile Validation:</strong> Please verify your household and identity details in profile settings.</div><div class="activity-time">Account Settings</div></div></div>
          </div>
        </div>`}
      </div>

      <div class="chart-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.1) 0%,rgba(6,182,212,0.1) 100%);">
        <h2 class="card-title" style="margin-bottom:8px;">Welcome back, ${user.fullname}!</h2>
        <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
          Welcome to the <strong>Cyberspace</strong> Resident Service Portal.
          ${isAdmin ? 'As <strong>Admin</strong>, you can manage residents, assign permissions, and audit activity logs.' : 'As a <strong>Resident</strong> of unit <strong>' + user.room + '</strong>, you can view bills, announcements, and update your profile.'}
        </p>
      </div>`;
  }
}
