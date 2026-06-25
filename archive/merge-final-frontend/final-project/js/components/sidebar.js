/**
 * THÀNH PHẦN THANH ĐIỀU HƯỚNG (Sidebar Component)
 * Tự động thay đổi menu điều hướng theo quyền truy cập (Admin hoặc Cư dân).
 * Hiển thị giao diện hoàn toàn bằng Tiếng Anh, chú thích bằng Tiếng Việt.
 */
export class Sidebar {
  static render(container, activeTab, user, onTabChange, onLogout) {
    if (!user) {
      container.innerHTML = '';
      return;
    }

    // Định nghĩa các thẻ menu cơ bản (Giao diện Tiếng Anh)
    const navItems = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21.75h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21.828V12a1.875 1.875 0 011.875-1.875h3.75A1.875 1.875 0 0115.75 12v9.828" />
               </svg>`
      }
    ];

    // Nếu người dùng có quyền Admin (Ban quản lý), bổ sung menu "User Management"
    if (user.role === 'admin') {
      navItems.push({
        id: 'users',
        label: 'User Management',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M14.214 16.058A9.366 9.366 0 0012 16c-2.115 0-4.078.697-5.666 1.874m8.88-1.816A8.88 8.88 0 0012 15c-1.92 0-3.693.61-5.13 1.648M12 11.25a3.375 3.375 0 100-6.75 3.375 3.375 0 000 6.75zm1.5-1.5a3.375 3.375 0 00-6.75 0 3.375 3.375 0 006.75 0z" />
               </svg>`
      });
    }

    // Bổ sung menu "My Profile" cho mọi vai trò tài khoản
    navItems.push({
      id: 'profile',
      label: 'My Profile',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>`
    });

    // Lấy ký tự cuối cùng của họ tên cư dân làm chữ hiển thị cho Avatar
    const initial = user.fullname ? user.fullname.trim().split(' ').pop().charAt(0).toUpperCase() : '?';
    // Chuyển đổi nhãn hiển thị vai trò (Role Label) sang Tiếng Anh
    let roleText = 'Resident';
    let roleClass = 'role-user';
    if (user.role === 'admin') {
      roleText = 'Admin';
      roleClass = 'role-admin';
    } else if (user.role === 'accountant') {
      roleText = 'Accountant';
      roleClass = 'role-accountant';
    }

    // Đổ cấu trúc HTML của thanh Sidebar vào Container
    container.innerHTML = `
      <div class="sidebar-logo">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18" />
        </svg>
        <span>Cyberspace Portal</span>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-label">Navigation Menu</div>
        ${navItems.map(item => `
          <a class="nav-item ${activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">
            ${item.icon}
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      
      <div class="sidebar-footer">
        <div class="user-avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name" title="${user.fullname}">${user.fullname}</div>
          <div class="user-role">
            <span class="role-badge ${roleClass}">${roleText}</span>
          </div>
        </div>
        <button class="btn-icon-logout" id="sidebar-btn-logout" title="Sign Out">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    `;

    // Gán sự kiện click lắng nghe việc chuyển đổi giữa các tab
    const items = container.querySelectorAll('.nav-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) {
          onTabChange(tab);
        }
      });
    });

    // Gán sự kiện click cho nút Đăng xuất (Sign Out) ở Sidebar Footer
    const logoutBtn = container.querySelector('#sidebar-btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        onLogout();
      });
    }
  }
}
