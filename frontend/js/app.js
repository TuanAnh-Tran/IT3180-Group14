/**
 * APP.JS — Cyberspace + BlueMoon Unified SPA
 * Điều phối đăng nhập, điều hướng, và render tất cả các module.
 */

import { AuthService }      from './auth.js?v=6';
import { Sidebar }          from './components/sidebar.js?v=3';
import { Dashboard }        from './components/dashboard.js?v=5';
import { UsersManager }     from './components/users.js?v=7';
import { ProfileView }      from './components/profile.js?v=5';
import { ResidentsManager } from './components/residents.js?v=11';
import { FeeManagerView, FM }  from './components/fees.js?v=6';
import { PaymentView, bridgeFM } from './components/payment.js?v=5';
import { API, cleanApiErrorMessage } from './api.js?v=7';

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
    background:${colors[type]||colors.info}; color:#fff;
    padding:14px 20px; border-radius:14px;
    box-shadow:0 10px 25px rgba(0,0,0,0.35);
    font-size:14px; font-weight:500; font-family:var(--font-family);
    animation:slideUp .25s ease; max-width:360px;
  `;
  toast.textContent = cleanApiErrorMessage(message, 'Something went wrong. Please try again.');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== AUTH SCREENS ==========
function renderAuthScreen(tab = 'login') {
  app.innerHTML = `
    <div class="auth-shell">
      <video class="auth-bg-video" autoplay muted loop playsinline preload="auto">
        <source src="assets/videos/4029958-hd_1280_720_30fps.mp4" type="video/mp4">
      </video>
      <div class="auth-bg-overlay"></div>
      <div class="auth-card-wrap">
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
          <button id="tab-login" onclick="window.__switchAuthTab('login')" style="flex:1;border:none;padding:10px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;background:${tab==='login'?'var(--color-primary)':'transparent'};color:${tab==='login'?'#fff':'var(--text-secondary)'};transition:var(--transition-fast);">Sign In</button>
          <button id="tab-register" onclick="window.__switchAuthTab('register')" style="flex:1;border:none;padding:10px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;background:${tab==='register'?'var(--color-primary)':'transparent'};color:${tab==='register'?'#fff':'var(--text-secondary)'};transition:var(--transition-fast);">Register</button>
        </div>

        <!-- Login form -->
        <div id="auth-login" style="display:${tab==='login'?'block':'none'};">
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
              <div class="form-group" style="position:relative; margin-bottom: 24px;">
                <label class="form-label">Password</label>
                <div class="input-wrapper">
                  <span class="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input type="password" class="form-control" id="loginPassword" placeholder="Enter password">
                </div>
                <div style="text-align: right; margin-top: 6px;">
                  <a href="#" id="linkForgotPassword" style="color: var(--color-primary); font-size: 13px; text-decoration: none; font-weight: 500;">Forgot Password?</a>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;" id="loginBtn">Sign In</button>
            </form>
            <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--text-muted);">Demo: <strong style="color:var(--color-primary);">admin</strong> / admin123 &nbsp;|&nbsp; <strong style="color:var(--color-primary);">accountant</strong> / accountant123 &nbsp;|&nbsp; <strong style="color:var(--color-accent);">resident1</strong> / user123</p>
          </div>
        </div>

        <!-- Register form -->
        <div id="auth-register" style="display:${tab==='register'?'block':'none'};">
          <div style="background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:20px; padding:28px;">
            <h2 style="font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 20px;">Create resident account</h2>
            <form id="registerForm">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Username *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg></span>
                  <input type="text" class="form-control" id="regUsername" placeholder="e.g. nguyenan" required pattern="[a-z0-9._-]{4,50}" title="4-50 lowercase letters, digits, dots, underscores or hyphens"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Email *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.909A2.25 2.25 0 012.25 8.993V6.75"/></svg></span>
                  <input type="email" class="form-control" id="regEmail" placeholder="you@example.com" required></div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Full Name *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                  <input type="text" class="form-control" id="regFullname" placeholder="Your full name"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Room Number *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75"/></svg></span>
                  <input type="text" class="form-control" id="regRoom" placeholder="e.g. A1201"></div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Citizen ID (CCCD) *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></span>
                  <input type="text" class="form-control" id="regIdentityNo" placeholder="12 digits" required pattern="(001|002|004|006|008|010|011|012|014|015|017|019|020|022|024|025|026|027|030|031|033|034|035|036|037|038|040|042|044|045|046|048|049|051|052|054|056|058|060|062|064|066|067|068|070|072|074|075|077|079|080|082|083|084|086|087|089|091|092|093|094|095|096)\\d{9}" maxlength="12" title="Citizen ID must contain exactly 12 digits and start with a valid Vietnamese province/city code"></div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Phone *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.514 2.018a11.233 11.233 0 01-5.111-5.111l2.018-1.514c.361-.272.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg></span>
                  <input type="tel" class="form-control" id="regPhone" placeholder="10 digits" required pattern="0[35789]\\d{8}" maxlength="10" title="Vietnamese mobile number, for example 0987654321"></div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Password *</label>
                  <div class="input-wrapper"><span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg></span>
                  <input type="password" class="form-control" id="regPassword" placeholder="Min 6 chars"></div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Account Role *</label>
                  <div class="input-wrapper">
                    <span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.999.43-1.563A6 6 0 1121.75 8.25z"/></svg></span>
                    <select class="form-control" id="regRole" onchange="window.__onRoleChange()" style="cursor:pointer; appearance: none; background: transparent; border: none; width: 100%; padding-left: 40px; color: var(--text-primary);">
                      <option value="user" style="background:var(--bg-secondary);">Resident</option>
                      <option value="admin" style="background:var(--bg-secondary);">Admin</option>
                    </select>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0; display:none;" id="adminSecretGroup">
                  <label class="form-label">Admin Secret Key *</label>
                  <div class="input-wrapper" style="position:relative;">
                    <span class="input-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"/></svg></span>
                    <input type="password" class="form-control" id="regAdminSecret" placeholder="Admin secret key" style="padding-right:45px;">
                    <button type="button" onclick="window.__toggleRegPassword('regAdminSecret')" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; padding:6px; font-size:14px; z-index:10;">👁️</button>
                  </div>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;margin-top:16px;" id="registerBtn">Create Account</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Forgot Password Modal -->
    <div id="forgot-password-dialog" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
      <div style="background:var(--bg-secondary); padding:24px; border-radius:20px; width:100%; max-width:360px; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;">Reset Password</h3>
        <form id="forgot-pwd-step-1">
          <input type="email" class="form-control" id="forgotPwdEmail" placeholder="Enter your email" required style="width:100%; margin-bottom:12px;">
          <button type="submit" class="btn btn-primary" style="width:100%;">Send OTP</button>
        </form>
        <form id="forgot-pwd-step-2" style="display:none;">
          <input type="text" class="form-control" id="forgotPwdOtp" placeholder="OTP" required style="width:100%; margin-bottom:8px;">
          <input type="password" class="form-control" id="forgotPwdNew" placeholder="New Password" required style="width:100%; margin-bottom:12px;">
          <button type="submit" class="btn btn-primary" style="width:100%;">Reset Password</button>
        </form>
        <button id="close-forgot-pwd" style="background:none; border:none; color:var(--text-secondary); width:100%; margin-top:12px; cursor:pointer;">Cancel</button>
      </div>
    </div>
  `;

  // Apply minimal style for modal
  const modalStyle = document.createElement('style');
  modalStyle.textContent = `#forgot-password-dialog.active { display:flex !important; }`;
  document.head.appendChild(modalStyle);

  window.__switchAuthTab = (tab) => renderAuthScreen(tab);

  // Auth interaction logic
  const linkForgot = document.getElementById('linkForgotPassword');
  const fpDialog = document.getElementById('forgot-password-dialog');
  const fpClose = document.getElementById('close-forgot-pwd');
  const fpStep1 = document.getElementById('forgot-pwd-step-1');
  const fpStep2 = document.getElementById('forgot-pwd-step-2');
  let resettingEmail = '';

  linkForgot.addEventListener('click', (e) => {
    e.preventDefault();
    fpStep1.style.display = 'block';
    fpStep2.style.display = 'none';
    fpDialog.classList.add('active');
  });

  fpClose.addEventListener('click', () => fpDialog.classList.remove('active'));

  fpStep1.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotPwdEmail').value;
    try {
      await AuthService.requestPasswordReset(email);
      resettingEmail = email;
      showToast('OTP sent!', 'success');
      fpStep1.style.display = 'none';
      fpStep2.style.display = 'block';
    } catch (err) { showToast(err.message, 'error'); }
  });

  fpStep2.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await AuthService.resetPassword(resettingEmail, document.getElementById('forgotPwdOtp').value, document.getElementById('forgotPwdNew').value);
      showToast('Reset successful!', 'success');
      fpDialog.classList.remove('active');
    } catch (err) { showToast(err.message, 'error'); }
  });
  window.__toggleRegPassword = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  };

  window.__onRoleChange = () => {
    const role = document.getElementById('regRole')?.value;
    const secretGroup = document.getElementById('adminSecretGroup');
    const secretInput = document.getElementById('regAdminSecret');
    if (!secretGroup || !secretInput) return;
    if (role === 'admin') {
      secretGroup.style.display = 'block';
      secretInput.required = true;
    } else {
      secretGroup.style.display = 'none';
      secretInput.required = false;
      secretInput.value = '';
    }
  };

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
    const selectedRole = document.getElementById('regRole')?.value || 'user';
    const adminSecret = document.getElementById('regAdminSecret')?.value || '';
    if (selectedRole === 'admin') {
      if (!adminSecret) {
        showToast('Please enter the Admin Secret Key!', 'error');
        return;
      }
      const frontendAdminSecret = window.ADMIN_SECRET_KEY || window.APP_ADMIN_SECRET || 'CYBER@ADMIN2025';
      if (adminSecret !== frontendAdminSecret) {
        showToast('Invalid Admin Secret Key! Contact your system operator.', 'error');
        return;
      }
    }

    btn.textContent = 'Creating...'; btn.disabled = true;
    try {
      const registeredUser = await AuthService.register(
        document.getElementById('regUsername').value,
        document.getElementById('regEmail').value,
        document.getElementById('regFullname').value,
        document.getElementById('regRoom').value,
        document.getElementById('regPhone').value,
        document.getElementById('regIdentityNo').value,
        document.getElementById('regPassword').value,
        selectedRole === 'admin' ? adminSecret : '',
        selectedRole
      );
      if (registeredUser && registeredUser.username) {
        renderMainApp(registeredUser);
        return;
      }
      showToast('Registration successful! Please wait for Admin approval.', 'success');
      window.__switchAuthTab('login');
      btn.textContent = 'Create Account'; btn.disabled = false;
      document.getElementById('registerForm').reset();
    } catch (err) {
      showToast(err.message, 'error');
      btn.textContent = 'Create Account'; btn.disabled = false;
    }
  });
}

// ========== MAIN APP ==========
function renderMainApp(user) {
  // Nav items: dashboard, users (admin only), residents, profile
  const navItems = [
    'dashboard', 
    ...(user.role === 'admin' ? ['users'] : []), 
    ...(user.role === 'admin' || user.role === 'accountant' ? ['fees'] : []), 
    'residents', 
    'payment', 
    'profile'
  ];

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
          <div class="topbar-right" style="position:relative; display:flex; align-items:center; gap:20px;">
            <!-- Notification Bell -->
            <div id="topbar-bell-btn" style="position:relative; cursor:pointer; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; transition:var(--transition-fast);" class="hover-glass">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:22px;height:22px;color:var(--text-secondary);">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a9.04 9.04 0 01-1.657 0m0 0a15.998 15.998 0 00-3.351-1.657m3.351 1.657a1.002 1.002 0 00-.22.684l-.004.004M14.857 17.082a8.96 8.96 0 003.351-1.657m-3.351 1.657H9m6-11.25a3.375 3.375 0 00-6.75 0V7.5a1.5 1.5 0 001.5 1.5h3.75a1.5 1.5 0 001.5-1.5V5.832zM12 3v1.5" />
              </svg>
              <span id="notif-badge" style="display:none; position:absolute; top:2px; right:2px; background:#ef4444; color:#fff; font-size:10px; font-weight:800; padding:2px 5px; border-radius:10px; line-height:1; min-width:14px; text-align:center;">0</span>
            </div>

            <!-- Dropdown danh sách thông báo -->
            <div id="notif-dropdown" style="display:none; position:absolute; top:46px; right:0; width:340px; background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-lg); box-shadow:var(--shadow-lg); z-index:1000; overflow:hidden;">
              <div style="padding:12px 16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:13px; color:var(--text-primary);">Notifications</span>
                <span id="notif-mark-all-read-btn" style="font-size:11px; color:var(--color-primary); cursor:pointer; font-weight:600;">Mark all as read</span>
              </div>
              <div id="notif-list-container" style="max-height:280px; overflow-y:auto; font-size:12px;">
                <!-- Dữ liệu thông báo đổ vào đây -->
              </div>
            </div>

            <div class="topbar-user" style="display:flex; align-items:center; gap:8px;">
              <div class="user-avatar" style="width:36px;height:36px;font-size:14px;">${(user.fullname||'?').trim().split(' ').pop().charAt(0).toUpperCase()}</div>
              <span style="font-size:14px;color:var(--text-secondary);">${user.fullname}</span>
            </div>
          </div>
        </header>
        <main class="content-area" id="content"></main>
      </div>
    </div>
  `;

  let activeTab = 'dashboard';
  const sidebar  = document.getElementById('sidebar');
  const content  = document.getElementById('content');

  // --- LOGIC THÔNG BÁO ---
  const bellBtn = document.getElementById('topbar-bell-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const notifBadge = document.getElementById('notif-badge');
  const notifListContainer = document.getElementById('notif-list-container');
  const markAllReadBtn = document.getElementById('notif-mark-all-read-btn');

  // Load danh sách thông báo
  async function loadNotifications() {
    let list = [];
    try {
      list = await API.getNotifications();
    } catch (e) {
      console.warn("Notification API is unavailable:", e.message);
    }

    // Cập nhật Badge
    const unreadCount = list.filter(n => !n.isRead && !n.read).length;
    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount;
      notifBadge.style.display = 'block';
    } else {
      notifBadge.style.display = 'none';
    }

    // Render danh sách
    if (list.length === 0) {
      notifListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">No notifications available.</div>`;
      return;
    }

    notifListContainer.innerHTML = list.map(n => {
      const readState = n.isRead || n.read;
      const bg = readState ? 'transparent' : 'var(--bg-tertiary)';
      const fontWeight = readState ? '400' : '700';
      const indicator = readState ? '' : `<span style="display:inline-block; width:6px; height:6px; background:var(--color-primary); border-radius:50%; margin-left:6px;"></span>`;
      return `
        <div class="notif-item" data-id="${n.id}" style="padding:12px 16px; border-bottom:1px solid var(--border-glass); background:${bg}; cursor:pointer; transition:var(--transition-fast);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-weight:${fontWeight}; color:var(--text-primary); display:flex; align-items:center;">${n.title}${indicator}</strong>
            <span style="font-size:10px; color:var(--text-muted);">${new Date(n.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div style="color:var(--text-secondary); line-height:1.4;">${n.content}</div>
        </div>
      `;
    }).join('');

    notifListContainer.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        try {
          await API.markNotificationRead(id);
        } catch (e) {
          console.warn("Unable to mark notification as read:", e.message);
        }
        loadNotifications();
      });
    });
  }
  // Toggle Dropdown
  if (bellBtn) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notifDropdown.style.display === 'block';
      notifDropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        loadNotifications();
      }
    });
  }

  document.addEventListener('click', () => {
    if (notifDropdown) notifDropdown.style.display = 'none';
  });

  if (notifDropdown) {
    notifDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Đánh dấu tất cả đã đọc
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
      try {
        await API.markAllNotificationsRead();
      } catch (e) {
        console.warn("Unable to mark notifications as read:", e.message);
      }
      loadNotifications();
    });
  }
  if (bellBtn) {
    loadNotifications();
    const notifInterval = setInterval(() => {
      if (document.getElementById('topbar-bell-btn')) {
        loadNotifications();
      } else {
        clearInterval(notifInterval);
      }
    }, 15000);
  }

  // Sidebar mobile toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-open');
  });

  const tabTitles = {
    dashboard: ['Dashboard', 'Overview'],
    users:     ['User Management', 'Accounts & Roles'],
    residents: (user.role === 'admin' || user.role === 'accountant') ? ['Resident Manager', 'Households & Apartments'] : ['My Household', 'View household info & members'],
    fees:      ['Fee Manager', 'Household Fees — Java Backend'],
    payment:   (user.role === 'admin' || user.role === 'accountant') ? ['Payment & Statistics', 'Payment · Receipt · Statistics — Java Backend'] : ['My Bills & Receipts', 'View unpaid bills and payment history'],
    profile:   ['My Profile', 'Account Settings'],
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
    if (tab === 'dashboard')  Dashboard.render(content, user);
    if (tab === 'users')      UsersManager.render(content, user, showToast);
    if (tab === 'residents')  ResidentsManager.render(content, user, showToast);
    if (tab === 'fees')       FeeManagerView.render(content, showToast, user);
    if (tab === 'payment')    PaymentView.render(content, user, showToast);
    if (tab === 'profile')    ProfileView.render(content, user, showToast, (updated) => {
      user = updated;
      // Update topbar avatar/name
      document.querySelector('.topbar-user span').textContent = user.fullname;
      document.querySelector('.topbar-user .user-avatar').textContent =
        (user.fullname||'?').trim().split(' ').pop().charAt(0).toUpperCase();
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
Sidebar.render = function(container, activeTab, user, onTabChange, onLogout) {
  _origSidebarRender(container, activeTab, user, onTabChange, onLogout);

  // Inject "Resident Manager" nav item before Profile
  const nav = container.querySelector('.sidebar-nav');
  if (!nav) return;
  const profileItem = nav.querySelector('[data-tab="profile"]');  const resItem = document.createElement('a');
  resItem.className = `nav-item ${activeTab === 'residents' ? 'active' : ''}`;
  resItem.setAttribute('data-tab', 'residents');
  resItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21.828V12a1.875 1.875 0 011.875-1.875h3.75A1.875 1.875 0 0115.75 12v9.828"/>
    </svg>
    <span>${(user.role === 'admin' || user.role === 'accountant') ? 'Resident Manager' : 'My Household'}</span>
  `;
  resItem.addEventListener('click', (e) => {
    e.preventDefault();
    onTabChange('residents');
  });
  nav.insertBefore(resItem, profileItem);

  // Inject "Fee Manager" nav item before Profile (For Admin and Accountant)
  if (user.role === 'admin' || user.role === 'accountant') {
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
  }

  // Inject "Payment & Stats" nav item before Profile
  const payItem = document.createElement('a');
  payItem.className = `nav-item ${activeTab === 'payment' ? 'active' : ''}`;
  payItem.setAttribute('data-tab', 'payment');
  payItem.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
    </svg>
    <span>${(user.role === 'admin' || user.role === 'accountant') ? 'Payment & Stats' : 'My Bills & Receipts'}</span>
  `;
  payItem.addEventListener('click', (e) => {
    e.preventDefault();
    onTabChange('payment');
  });
  nav.insertBefore(payItem, profileItem);
};

// ========== BOOT ==========
async function boot() {
  // Inject global animation keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes slideUp { from { transform:translateY(16px); opacity:0; } to { transform:translateY(0); opacity:1; } }
  .sidebar-open { transform: translateX(0) !important; }
  .notif-item:hover { background: var(--bg-tertiary) !important; opacity: 0.95; }
  .hover-glass:hover { background: var(--border-glass) !important; }`;
  document.head.appendChild(style);

  const user = AuthService.getCurrentUser();
  if (user) {
    renderMainApp(user);
  } else {
    renderAuthScreen('login');
  }
}

boot();
