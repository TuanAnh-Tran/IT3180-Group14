import { AuthService } from './auth.js';
import { Sidebar } from './components/sidebar.js';
import { Dashboard } from './components/dashboard.js';
import { UsersManager } from './components/users.js';
import { ProfileView } from './components/profile.js';

/**
 * ĐIỀU PHỐI CHÍNH CỦA ỨNG DỤNG SPA (App Coordinator)
 * Quản lý vòng đời ứng dụng, định tuyến Client-side Routing, hiển thị Login/Register
 * và điều hành hệ thống Toasts thông báo bay cao cấp.
 * Giao diện Tiếng Anh, chú thích 100% Tiếng Việt.
 */
class App {
  constructor() {
    this.activeTab = 'dashboard';
    this.user = null;

    // Chọn vùng mount ứng dụng
    this.appEl = document.getElementById('app');
    this.toastContainer = null;

    this.init();
  }

  async init() {
    // Khởi tạo container chứa các Toast cảnh báo ở góc màn hình
    this.createToastContainer();
    // Lấy thông tin Session tài khoản nếu có từ sessionStorage
    this.user = AuthService.getCurrentUser();
    this.render();
  }

  /**
   * Router trung tâm - Quyết định vẽ màn hình Auth hay màn hình App Shell
   */
  async render() {
    if (!AuthService.isAuthenticated()) {
      // Chưa đăng nhập: Vẽ biểu mẫu đăng nhập/đăng ký
      this.renderAuth();
    } else {
      // Đã đăng nhập: Tải thông tin tài khoản và dựng khung sườn (App Shell)
      this.user = AuthService.getCurrentUser();
      await this.renderAppShell();
    }
  }

  /* ==========================================================================
     PHẦN 1: CÁC GIAO DIỆN XÁC THỰC (Login & Register Views)
     ========================================================================== */
  renderAuth(view = 'login') {
    this.appEl.innerHTML = `
      <div class="bg-glow-1"></div>
      <div class="bg-glow-2"></div>
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18" />
            </svg>
            <span>Cyberspace Portal</span>
          </div>
          
          ${view === 'login' ? this.getLoginHTML() : this.getRegisterHTML()}
        </div>
      </div>
    `;

    // Thiết lập sự kiện gửi biểu mẫu Đăng nhập (Sign In Submit)
    if (view === 'login') {
      const form = this.appEl.querySelector('#login-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value;
        const password = form.password.value;

        try {
          this.user = await AuthService.login(username, password);
          // Thông báo chào mừng bằng Tiếng Anh
          this.showToast(`Welcome back, ${this.user.fullname}!`, 'success');
          this.render();
        } catch (err) {
          // Bắt lỗi đăng nhập (Sai tài khoản/mật khẩu)
          this.showToast(err.message, 'error');
        }
      });

      // Chuyển sang form Đăng ký cư dân
      const toRegister = this.appEl.querySelector('#link-to-register');
      toRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.renderAuth('register');
      });
    } else {
      // Thiết lập sự kiện gửi biểu mẫu Đăng ký (Sign Up Submit)
      const form = this.appEl.querySelector('#register-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value;
        const fullname = form.fullname.value;
        const room = form.room.value;
        const phone = form.phone.value;
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;

        // Kiểm tra tính đồng nhất của mật khẩu nhập lại
        if (password !== confirmPassword) {
          this.showToast('Confirm password does not match new password!', 'warning');
          return;
        }

        try {
          this.user = await AuthService.register(username, fullname, room, phone, password);
          this.showToast('Resident account created successfully!', 'success');
          this.render();
        } catch (err) {
          // Bắt lỗi đăng ký (Trùng tên username từ db.js)
          this.showToast(err.message, 'error');
        }
      });

      // Chuyển lại form Đăng nhập
      const toLogin = this.appEl.querySelector('#link-to-login');
      toLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.renderAuth('login');
      });
    }
  }

  getLoginHTML() {
    return `
      <div class="auth-header">
        <h2>Sign In to Resident Portal</h2>
        <p>Please enter your credential details</p>
      </div>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">Username</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </span>
            <input type="text" class="form-control" name="username" required placeholder="Enter username..." autocomplete="username">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </span>
            <input type="password" class="form-control" name="password" required placeholder="••••••••" autocomplete="current-password">
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
          Sign In Now
        </button>
      </form>
      <div class="auth-footer">
        New resident? <a href="#" id="link-to-register">Sign Up Now</a>
      </div>
    `;
  }

  getRegisterHTML() {
    return `
      <div class="auth-header">
        <h2>Create Resident Account</h2>
        <p>Quickly create your apartment account</p>
      </div>
      <form id="register-form">
        <div class="form-group">
          <label class="form-label">Username (lowercase, no spaces) *</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </span>
            <input type="text" class="form-control" name="username" required placeholder="e.g. cuongnguyen" minlength="4">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Resident Full Name *</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <input type="text" class="form-control" name="fullname" required placeholder="Enter full name...">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Room / Unit</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75" />
                </svg>
              </span>
              <input type="text" class="form-control" name="room" placeholder="e.g. Room 1204" style="padding-left: 36px;">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Phone Number</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.514 2.018a11.233 11.233 0 01-5.111-5.111l2.018-1.514c.361-.272.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </span>
              <input type="tel" class="form-control" name="phone" placeholder="Contact number..." style="padding-left: 36px;">
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Password *</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input type="password" class="form-control" name="password" required placeholder="Min 6 characters" minlength="6" style="padding-left: 36px;">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Confirm Password *</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                </svg>
              </span>
              <input type="password" class="form-control" name="confirmPassword" required placeholder="Confirm..." minlength="6" style="padding-left: 36px;">
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary">
          Sign Up & Sign In
        </button>
      </form>
      <div class="auth-footer">
        Already registered? <a href="#" id="link-to-login">Sign In Now</a>
      </div>
    `;
  }

  /* ==========================================================================
     PHẦN 2: DỰNG KHUNG SƯỜN CHÍNH (App Shell Structure)
     ========================================================================== */
  async renderAppShell() {
    this.appEl.innerHTML = `
      <div class="bg-glow-1"></div>
      <div class="bg-glow-2"></div>
      <div class="app-shell">
        <!-- Vùng lắp Sidebar điều hướng (Navigation Sidebar) -->
        <aside class="app-sidebar" id="app-sidebar-element"></aside>
        
        <!-- Lớp phủ màn hình di động (Mobile Drawer Overlay) -->
        <div class="sidebar-overlay" id="sidebar-overlay-element"></div>
        
        <!-- Vùng chứa nội dung trang -->
        <div class="app-container">
          <!-- Thanh Header phía trên -->
          <header class="app-header">
            <div class="header-title-area">
              <button class="btn-menu-toggle" id="btn-menu-toggle-element">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 24px; height: 24px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <h1 class="header-title" id="header-title-element">Dashboard</h1>
            </div>
            
            <div class="header-actions">
              <div class="notifications-widget" title="System Notifications">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 22px; height: 22px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a9.049 9.049 0 01-5.12 1.341 8.97 8.97 0 01-4.899-1.444M11.94 1.75a3 3 0 013 3V5.25a9 9 0 01-6 0v-.5a3 3 0 013-3zm0 18.25a9.07 9.07 0 01-2.09-.22m2.09.22A9.017 9.017 0 0015 15a9 9 0 00-6-1.5M12 21.75a9.017 9.017 0 01-4.899-1.444" />
                </svg>
                <span class="notif-badge"></span>
              </div>
            </div>
          </header>
          
          <!-- Vùng chèn các Component giao diện con động (Main Viewport) -->
          <main class="app-content" id="app-content-element"></main>
        </div>
      </div>
    `;

    // Chọn phần tử DOM và xử lý sự kiện bấm Hamburger Drawer trên di động
    this.sidebarEl = this.appEl.querySelector('#app-sidebar-element');
    this.sidebarOverlayEl = this.appEl.querySelector('#sidebar-overlay-element');
    this.menuToggleBtn = this.appEl.querySelector('#btn-menu-toggle-element');

    const toggleSidebar = () => {
      this.sidebarEl.classList.toggle('active');
      this.sidebarOverlayEl.classList.toggle('active');
    };

    this.menuToggleBtn.addEventListener('click', toggleSidebar);
    this.sidebarOverlayEl.addEventListener('click', toggleSidebar);

    // Kích hoạt nạp thanh Sidebar và nội dung Content chính lần đầu
    await this.renderSidebar();
    await this.renderContent();
  }

  async renderSidebar() {
    Sidebar.render(
      this.sidebarEl,
      this.activeTab,
      this.user,
      // Callback đổi Tab (onTabChange)
      async (newTab) => {
        this.activeTab = newTab;
        
        // Tự động thu gọn Menu Drawer trên di động khi người dùng chọn tab mới
        this.sidebarEl.classList.remove('active');
        this.sidebarOverlayEl.classList.remove('active');

        // Render lại Sidebar để kích hoạt thuộc tính .active trực quan của nút bấm
        await this.renderSidebar();
        // Dựng giao diện tương ứng với Tab vừa chọn
        await this.renderContent();
      },
      // Callback Đăng xuất (onLogout) với xác thực Tiếng Anh
      async () => {
        if (confirm('Are you sure you want to sign out of the Cyberspace system?')) {
          await AuthService.logout();
          this.user = null;
          this.activeTab = 'dashboard';
          this.showToast('Signed out successfully!', 'info');
          this.render();
        }
      }
    );
  }

  /**
   * Bộ định tuyến động Client-side SPA Router
   */
  async renderContent() {
    const contentEl = this.appEl.querySelector('#app-content-element');
    const headerTitleEl = this.appEl.querySelector('#header-title-element');
    
    // RÀNG BUỘC PHÂN QUYỀN TRÊN ROUTER: Nếu Cư dân thường hack url/tab để vào trang CRUD
    if (this.activeTab === 'users' && this.user.role !== 'admin') {
      this.activeTab = 'dashboard';
      this.showToast('Access denied! Insufficient privileges.', 'error');
      await this.renderSidebar();
    }

    // Kết xuất màn hình tương thích với activeTab và gán Title Tiếng Anh tương thích
    switch (this.activeTab) {
      case 'dashboard':
        headerTitleEl.innerText = 'Resident Portal Dashboard';
        await Dashboard.render(contentEl, this.user);
        break;
      case 'users':
        headerTitleEl.innerText = 'Resident & Accounts Registry';
        await UsersManager.render(contentEl, this.user, this.showToast.bind(this));
        break;
      case 'profile':
        headerTitleEl.innerText = 'My Resident Profile';
        ProfileView.render(
          contentEl,
          this.user,
          this.showToast.bind(this),
          // Callback cập nhật đồng bộ hồ sơ cư dân (onProfileUpdate)
          async (updatedUser) => {
            this.user = updatedUser;
            await this.renderSidebar(); // Đắp lại Avatar mới lên thanh Sidebar ngay lập tức
            await this.renderContent(); // Vẽ lại giao diện form Profile
          }
        );
        break;
      default:
        contentEl.innerHTML = `<h2 class="card-title">Under Construction: ${this.activeTab}</h2>`;
    }
  }

  /* ==========================================================================
     PHẦN 3: CÁC TIỆN ÍCH GIAO DIỆN (Toast Notifications System)
     ========================================================================== */
  createToastContainer() {
    this.toastContainer = document.getElementById('toast-container');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  /**
   * Tạo thông báo nổi thời gian thực góc trên bên phải (English Toasts)
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') {
      icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 20px; height: 20px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>`;
    } else if (type === 'error') {
      icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 20px; height: 20px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>`;
    } else {
      icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 20px; height: 20px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">${message}</div>
      <div class="toast-progress"></div>
    `;

    this.toastContainer.appendChild(toast);

    // Kích hoạt hoạt cảnh trượt vào mượt mà (slide-in)
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Tạo thanh chạy co ngắn dần biểu thị thời hạn đóng Toast (Progress Bar)
    const progress = toast.querySelector('.toast-progress');
    progress.style.transition = 'width 4s linear';
    setTimeout(() => {
      progress.style.width = '0%';
    }, 50);

    // Tự động thu gọn và gỡ khỏi cấu trúc DOM sau 4 giây
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 4000);
  }
}

// Khởi tạo thực thể App khi toàn bộ cấu trúc DOM của tài liệu sẵn sàng
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
