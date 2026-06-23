/**
 * APP.JS — Cyberspace + BlueMoon Unified SPA
 * Điều phối đăng nhập, điều hướng, và render tất cả các module.
 */

import { AuthService } from './auth.js';
import { ApartmentDB } from './db.js';
import { Sidebar } from './components/sidebar.js';
import { Dashboard } from './components/dashboard.js';
import { UsersManager } from './components/users.js';
import { ProfileView } from './components/profile.js';
import { ResidentsManager } from './components/residents.js';
import { FeeManagerView, FM } from './components/fees.js';
import { PaymentView, bridgeFM } from './components/payment.js';

const app = document.getElementById('app');

// ========== TOAST ==========
function showToast(message, type = 'info') {
  const existing = document.getElementById('cs-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cs-toast';
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#6366f1' };
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${colors[type] || colors.info}; color:#fff;
    padding:14px 20px; border-radius:14px;
    box-shadow:0 10px 25px rgba(0,0,0,0.35);
    font-size:14px; font-weight:500; font-family:var(--font-family);
    animation:slideUp .25s ease; max-width:360px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== AUTH SCREENS ==========
function renderAuthScreen(tab = 'login') {
  app.innerHTML = `
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-primary); padding:24px;">
      <div style="width:100%; max-width:420px;">
        <!-- Logo -->
        <div style="text-align:center; margin-bottom:32px;">
          <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,var(--color-primary),var(--color-accent));display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="white" style="width:32px;height:32px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18" />
            </svg>
          </div>
          <h1 style="font-size:22px; font-weight:800; color:var(--text-primary); margin:0;">Cyberspace Portal</h1>
          <p style="color:var(--text-secondary); font-size:14px; margin:6px 0 0;">Resident & Apartment Management System</p>
        </div>

        <!-- Tab switcher -->
        <div style="display:flex; gap:8px; background:var(--bg-secondary); border-radius:14px; padding:6px; margin-bottom:24px; border:1px solid var(--border-glass);">
          <button id="tab-login" onclick="window.__switchAuthTab('login')" style="flex:1;border:none;padding:10px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;background:${tab === 'login' ? 'var(--color-primary)' : 'transparent'};color:${tab === 'login' ? '#fff' : 'var(--text-secondary)'};transition:var(--transition-fast);">Sign In</button>
          <button id="tab-register" onclick="window.__switchAuthTab('register')" style="flex:1;border:none;padding:10px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;background:${tab === 'register' ? 'var(--color-primary)' : 'transparent'};color:${tab === 'register' ? '#fff' : 'var(--text-secondary)'};transition:var(--transition-fast);">Register</button>
        </div>

        <!-- Login form -->
        <div id="auth-login" style="display:${tab === 'login' ? 'block' : 'none'};">
          <div style="background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:20px; padding:28px;">
            <h2 style="font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 20px;">Welcome back</h2>
            <form id="loginForm">
              <div class="form-group">
                <label class="form-label">Username</label>
                <div class="input-wrapper">
                  <span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg></span>
                  <input type="text" class="form-control" id="loginUsername" placeholder="Enter username" autocomplete="username">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="input-wrapper">
                  <span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg></span>
                  <input type="password" class="form-control" id="loginPassword" placeholder="Enter password" autocomplete="current-password">
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px;" id="loginBtn">Sign In</button>
            </form>
            <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--text-muted);">Demo: <strong style="color:var(--color-primary);">admin</strong> / admin123 &nbsp;|&nbsp; <strong style="color:var(--color-primary);">accountant</strong> / accountant123 &nbsp;|&nbsp; <strong style="color:var(--color-accent);">resident1</strong> / user123</p>
          </div>
        </div>

        <!-- Register form -->
        <div id="auth-register" style="display:${tab === 'register' ? 'block' : 'none'};">
          <div style="background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:20px; padding:28px;">
            <h2 style="font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 20px;">Create resident account</h2>
            <form id="registerForm">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Username *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg></span>
                  <input type="text" class="form-control" id="regUsername" placeholder="Min 4 chars"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Full Name *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                  <input type="text" class="form-control" id="regFullname" placeholder="Your full name"></div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Room Number</label>
                <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75"/></svg></span>
                <input type="text" class="form-control" id="regRoom" placeholder="e.g. Room 1204 - Block A"></div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Phone</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.514 2.018a11.233 11.233 0 01-5.111-5.111l2.018-1.514c.361-.272.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg></span>
                  <input type="tel" class="form-control" id="regPhone" placeholder="Phone number"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Password *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg></span>
                  <input type="password" class="form-control" id="regPassword" placeholder="Min 6 chars"></div>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;margin-top:16px;" id="registerBtn">Create Account</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  window.__switchAuthTab = (tab) => renderAuthScreen(tab);

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'Signing in...'; btn.disabled = true;
    try {
      const user = await AuthService.login(
        document.getElementById('loginUsername').value,
        document.getElementById('loginPassword').value
      );
      renderMainApp(user);
    } catch (err) {
      showToast(err.message, 'error');
      btn.textContent = 'Sign In'; btn.disabled = false;
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    btn.textContent = 'Creating...'; btn.disabled = true;
    try {
      const user = await AuthService.register(
        document.getElementById('regUsername').value,
        document.getElementById('regFullname').value,
        document.getElementById('regRoom').value,
        document.getElementById('regPhone').value,
        document.getElementById('regPassword').value
      );
      renderMainApp(user);
    } catch (err) {
      showToast(err.message, 'error');
      btn.textContent = 'Create Account'; btn.disabled = false;
    }
  });
}

// ========== MAIN APP ==========
function renderMainApp(user) {
  // Nav items: dashboard, users (admin only), residents, profile
  const navItems = ['dashboard', ...(user.role === 'admin' ? ['users'] : []), 'residents', 'fees', 'payment', 'profile'];

  // Expose FM globally for PaymentView
  window.__FM__ = FM;
  bridgeFM(FM);

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-wrapper">
        <header class="topbar" id="topbar">
          <div class="topbar-left">
            <button class="btn-icon-menu" id="menuToggle" title="Toggle sidebar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:22px;height:22px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
              </svg>
            </button>
            <div>
              <div class="topbar-title" id="topbar-title">Dashboard</div>
              <div class="topbar-sub" id="topbar-sub">Overview</div>
            </div>
          </div>
          <div class="topbar-right">
            <div class="topbar-user">
              <div class="user-avatar" style="width:36px;height:36px;font-size:14px;">${(user.fullname || '?').trim().split(' ').pop().charAt(0).toUpperCase()}</div>
              <span style="font-size:14px;color:var(--text-secondary);">${user.fullname}</span>
            </div>
          </div>
        </header>
        <main class="content-area" id="content"></main>
      </div>
    </div>
  `;

  let activeTab = 'dashboard';
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('content');

  // Sidebar mobile toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-open');
  });

  const tabTitles = {
    dashboard: ['Dashboard', 'Overview'],
    users: ['User Management', 'Accounts & Roles'],
    residents: ['Resident Manager', 'Households & Apartments'],
    fees: ['Fee Manager', 'Household fee management — Java Backend'],
    payment: ['Payment & Stats', 'Payment · Receipt · Statistics — Java Backend'],
    profile: ['My Profile', 'Account Settings'],
  };

  function switchTab(tab) {
    if (!navItems.includes(tab)) return;
    activeTab = tab;
    sidebar.classList.remove('sidebar-open');

    // Update topbar
    const [title, sub] = tabTitles[tab] || ['Portal', ''];
    document.getElementById('topbar-title').textContent = title;
    document.getElementById('topbar-sub').textContent = sub;

    // Re-render sidebar with new active
    Sidebar.render(sidebar, activeTab, user, switchTab, handleLogout);

    // Render content
    content.innerHTML = '';
    if (tab === 'dashboard') Dashboard.render(content, user);
    if (tab === 'users') UsersManager.render(content, user, showToast);
    if (tab === 'residents') ResidentsManager.render(content, showToast);
    if (tab === 'fees') FeeManagerView.render(content, user, showToast);
    if (tab === 'payment') PaymentView.render(content, user, showToast);
    if (tab === 'profile') ProfileView.render(content, user, showToast, (updated) => {
      user = updated;
      // Update topbar avatar/name
      document.querySelector('.topbar-user span').textContent = user.fullname;
      document.querySelector('.topbar-user .user-avatar').textContent =
        (user.fullname || '?').trim().split(' ').pop().charAt(0).toUpperCase();
      Sidebar.render(sidebar, activeTab, user, switchTab, handleLogout);
    });
  }

  async function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
      await AuthService.logout();
      renderAuthScreen('login');
    }
  }

  switchTab('dashboard');
}

// ========== SIDEBAR — thêm nav item "residents" ==========
// Patch Sidebar to include residents tab
const _origSidebarRender = Sidebar.render.bind(Sidebar);
Sidebar.render = function (container, activeTab, user, onTabChange, onLogout) {
  _origSidebarRender(container, activeTab, user, onTabChange, onLogout);

  // Inject "Resident Manager" nav item before Profile
  const nav = container.querySelector('.sidebar-nav');
  if (!nav) return;
  const profileItem = nav.querySelector('[data-tab="profile"]');
  if (!profileItem) return;

  const resItem = document.createElement('a');
  resItem.className = `nav-item ${activeTab === 'residents' ? 'active' : ''}`;
  resItem.setAttribute('data-tab', 'residents');
  resItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21.828V12a1.875 1.875 0 011.875-1.875h3.75A1.875 1.875 0 0115.75 12v9.828"/>
    </svg>
    <span>Resident Manager</span>
  `;
  resItem.addEventListener('click', (e) => {
    e.preventDefault();
    onTabChange('residents');
  });
  nav.insertBefore(resItem, profileItem);

  // Inject "Fee Manager" nav item before Profile
  const feeItem = document.createElement('a');
  feeItem.className = `nav-item ${activeTab === 'fees' ? 'active' : ''}`;
  feeItem.setAttribute('data-tab', 'fees');
  feeItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <span>Fee Manager</span>
  `;
  feeItem.addEventListener('click', (e) => {
    e.preventDefault();
    onTabChange('fees');
  });
  nav.insertBefore(feeItem, profileItem);

  // Inject "Payment & Stats" nav item before Profile
  const payItem = document.createElement('a');
  payItem.className = `nav-item ${activeTab === 'payment' ? 'active' : ''}`;
  payItem.setAttribute('data-tab', 'payment');
  payItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
    </svg>
    <span>Payment & Stats</span>
  `;
  payItem.addEventListener('click', (e) => {
    e.preventDefault();
    onTabChange('payment');
  });
  nav.insertBefore(payItem, profileItem);
};

// ========== BOOT ==========
async function boot() {
  await ApartmentDB.init();

  // Inject global animation keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes slideUp { from { transform:translateY(16px); opacity:0; } to { transform:translateY(0); opacity:1; } }
  .sidebar-open { transform: translateX(0) !important; }`;
  document.head.appendChild(style);

  const user = AuthService.getCurrentUser();
  if (user) {
    renderMainApp(user);
  } else {
    renderAuthScreen('login');
  }
}

boot();
