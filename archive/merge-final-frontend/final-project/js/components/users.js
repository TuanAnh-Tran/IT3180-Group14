import { ApartmentDB } from '../db.js';

/**
 * THÀNH PHẦN QUẢN LÝ CƯ DÂN (UsersManager Component)
 * Dành riêng cho quyền Admin. Hỗ trợ hiển thị bảng biểu, tìm kiếm thời gian thực,
 * phân quyền trực tiếp, xóa tài khoản và mở hộp thoại tạo mới.
 * Giao diện hiển thị Tiếng Anh, chú thích bằng Tiếng Việt.
 */
export class UsersManager {
  static async render(container, activeUser, showToast) {
    // RÀNG BUỘC BẢO MẬT: Nếu người dùng đang đăng nhập không phải admin, từ chối kết xuất
    if (activeUser.role !== 'admin') {
      container.innerHTML = `
        <div class="chart-card" style="text-align: center; padding: 48px;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 64px; height: 64px; color: var(--color-danger); margin-bottom: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <h2 class="card-title" style="color: var(--color-danger); margin-bottom: 8px;">Access Denied!</h2>
          <p style="color: var(--text-secondary);">You do not have the required administrative permissions to access the registry.</p>
        </div>
      `;
      return;
    }

    // Đổ khung HTML quản trị và Hộp thoại tạo mới (Giao diện Tiếng Anh)
    container.innerHTML = `
      <div class="chart-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">System Accounts Registry</h2>
            <p class="card-title-muted">Manage access roles and authorization for Management & Residents</p>
          </div>
        </div>

        <!-- Thanh công cụ tìm kiếm và lọc dữ liệu (Search & Filter Toolbar) -->
        <div class="table-toolbar">
          <div class="search-box">
            <span class="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input type="text" class="search-control" id="user-search-input" placeholder="Search by name, username, room...">
          </div>
          
          <div class="toolbar-actions">
            <select class="select-filter" id="user-role-filter">
              <option value="all">All Roles</option>
              <option value="admin">System Admin</option>
              <option value="accountant">Accountant</option>
              <option value="user">Resident</option>
            </select>
            
            <button class="btn btn-primary btn-add" id="btn-open-create-dialog">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add New Resident
            </button>
          </div>
        </div>

        <!-- Bảng hiển thị thông tin cư dân (Data Table) -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Full Name / Username</th>
                <th>Room / Unit</th>
                <th>Phone Number</th>
                <th>Access Role</th>
                <th style="width: 100px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="users-table-tbody">
              <!-- Render động danh sách các dòng tr ở JavaScript phía dưới -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Hộp thoại Thêm cư dân mới (Create User Dialog Modal) -->
      <div class="dialog-overlay" id="create-user-dialog">
        <div class="dialog-box">
          <div class="dialog-header">
            <h2 class="dialog-title">Add Resident Account</h2>
            <button class="btn-close-dialog" id="btn-close-create-dialog">&times;</button>
          </div>
          <form id="create-user-form">
            <div class="form-group">
              <label class="form-label">Username (lowercase, no spaces) <span style="color: var(--color-danger);">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                <input type="text" class="form-control" name="username" required placeholder="e.g. nguyenan">
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Resident Full Name <span style="color: var(--color-danger);">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <input type="text" class="form-control" name="fullname" required placeholder="e.g. An Nguyen">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Room Number / Unit</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                  </svg>
                </span>
                <input type="text" class="form-control" name="room" placeholder="e.g. Room 1204 - Block A">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.514 2.018a11.233 11.233 0 01-5.111-5.111l2.018-1.514c.361-.272.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </span>
                <input type="tel" class="form-control" name="phone" placeholder="e.g. 0912345678">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Default Password <span style="color: var(--color-danger);">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input type="password" class="form-control" name="password" required placeholder="Min 6 characters" minlength="6">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Access Authorization Role</label>
              <select class="select-filter" name="role" style="width: 100%; border-radius: var(--border-radius-md);">
                <option value="user">Resident</option>
                <option value="accountant">Accountant</option>
                <option value="admin">System Admin</option>
              </select>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-secondary" id="btn-cancel-create-dialog">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Account</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Biến trạng thái cục bộ để quản lý việc tìm kiếm và lọc
    let usersList = [];
    let searchQuery = '';
    let roleFilter = 'all';

    // Ánh xạ các phần tử DOM
    const tbody = container.querySelector('#users-table-tbody');
    const searchInput = container.querySelector('#user-search-input');
    const filterSelect = container.querySelector('#user-role-filter');
    const openDialogBtn = container.querySelector('#btn-open-create-dialog');
    const closeDialogBtn = container.querySelector('#btn-close-create-dialog');
    const cancelDialogBtn = container.querySelector('#btn-cancel-create-dialog');
    const dialogOverlay = container.querySelector('#create-user-dialog');
    const createForm = container.querySelector('#create-user-form');

    // Hàm render động nội dung bảng theo bộ lọc tìm kiếm
    const updateTable = () => {
      const filtered = usersList.filter(user => {
        // Tìm kiếm không phân biệt chữ hoa thường trên 4 trường dữ liệu
        const matchesSearch = 
          user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
      });

      // Nếu bộ lọc tìm kiếm trống, trả về thông báo phù hợp bằng Tiếng Anh
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
              No resident accounts found matching the filter!
            </td>
          </tr>
        `;
        return;
      }

      // Đổ danh sách tr của bảng dữ liệu cư dân
      tbody.innerHTML = filtered.map(user => {
        const isCurrent = user.username.toLowerCase() === activeUser.username.toLowerCase();
        const isSuperAdmin = user.username.toLowerCase() === 'admin';
        const initial = user.fullname.trim().split(' ').pop().charAt(0).toUpperCase();

        return `
          <tr data-username="${user.username}">
            <td>
              <div class="user-cell">
                <div class="user-cell-avatar">${initial}</div>
                <div class="user-cell-details">
                  <div class="user-cell-fullname">${user.fullname} ${isCurrent ? '<span style="color: var(--color-primary); font-size: 11px; font-weight: normal;">(You)</span>' : ''}</div>
                  <div class="user-cell-username">@${user.username}</div>
                </div>
              </div>
            </td>
            <td>${user.room}</td>
            <td>${user.phone}</td>
            <td>
              ${(() => {
                let badgeClass = 'role-user';
                let badgeLabel = 'Resident';
                if (user.role === 'admin') { badgeClass = 'role-admin'; badgeLabel = 'Admin'; }
                else if (user.role === 'accountant') { badgeClass = 'role-accountant'; badgeLabel = 'Accountant'; }
                
                return isSuperAdmin || isCurrent ? `
                  <span class="role-badge ${badgeClass}">
                    ${badgeLabel}
                  </span>
                ` : `
                  <select class="table-role-select" data-username="${user.username}">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>Resident</option>
                    <option value="accountant" ${user.role === 'accountant' ? 'selected' : ''}>Accountant</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>System Admin</option>
                  </select>
                `;
              })()}
            </td>
            <td style="text-align: center;">
              ${isSuperAdmin || isCurrent ? `
                <span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Protected</span>
              ` : `
                <div class="table-actions" style="justify-content: center;">
                  <button class="btn-icon btn-icon-delete" data-username="${user.username}" title="Delete Account">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              `}
            </td>
          </tr>
        `;
      }).join('');

      // Lắng nghe sự kiện đổi Role trực tiếp bằng Combobox (Admin phân quyền cư dân)
      tbody.querySelectorAll('.table-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const username = e.target.getAttribute('data-username');
          const newRole = e.target.value;
          try {
            await ApartmentDB.updateUserRole(username, newRole, activeUser.username);
            const roleNames = { admin: 'Admin', accountant: 'Accountant', user: 'Resident' };
            showToast(`Changed @${username}'s role to ${roleNames[newRole] || newRole}!`, 'success');
            // Tải lại mảng cư dân từ DB và kết xuất lại bảng
            usersList = await ApartmentDB.getUsers();
            updateTable();
          } catch (err) {
            showToast(err.message, 'error');
            updateTable();
          }
        });
      });

      // Lắng nghe sự kiện click nút Xóa tài khoản (Hộp thoại xác nhận Tiếng Anh)
      tbody.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const username = btn.getAttribute('data-username');
          if (confirm(`Are you sure you want to DELETE resident @${username} from the system? This action is permanent and cannot be undone!`)) {
            try {
              await ApartmentDB.deleteUser(username, activeUser.username);
              showToast(`Deleted account @${username} successfully!`, 'success');
              // Tải lại danh sách
              usersList = await ApartmentDB.getUsers();
              updateTable();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });
    };

    // Hàm gọi tải danh sách người dùng đầu tiên
    const loadUsers = async () => {
      usersList = await ApartmentDB.getUsers();
      updateTable();
    };
    await loadUsers();

    // Ràng buộc sự kiện bàn phím khi nhập tìm kiếm
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      updateTable();
    });

    // Ràng buộc sự kiện thay đổi select vai trò để lọc
    filterSelect.addEventListener('change', (e) => {
      roleFilter = e.target.value;
      updateTable();
    });

    // Điều phối hoạt động bật/tắt Hộp thoại tạo mới (Dialog Modal)
    const openDialog = () => {
      createForm.reset();
      dialogOverlay.classList.add('active');
    };

    const closeDialog = () => {
      dialogOverlay.classList.remove('active');
    };

    openDialogBtn.addEventListener('click', openDialog);
    closeDialogBtn.addEventListener('click', closeDialog);
    cancelDialogBtn.addEventListener('click', closeDialog);
    dialogOverlay.addEventListener('click', (e) => {
      if (e.target === dialogOverlay) closeDialog();
    });

    // Xử lý sự kiện Submit của Form tạo cư dân mới
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(createForm);
      const username = formData.get('username').trim().toLowerCase();
      const fullname = formData.get('fullname').trim();
      const room = formData.get('room').trim();
      const phone = formData.get('phone').trim();
      const password = formData.get('password');
      const role = formData.get('role');

      // Các kiểm tra hợp lệ tại client
      if (username.length < 4) {
        showToast('Username must be at least 4 characters long!', 'warning');
        return;
      }
      if (password.length < 6) {
        showToast('Default password must be at least 6 characters long!', 'warning');
        return;
      }

      try {
        // Thực thi tạo tài khoản. Trùng tên đăng nhập sẽ ném ra lỗi trùng username từ db.js!
        await ApartmentDB.createUser({
          username,
          fullname,
          room,
          phone,
          password,
          role,
          creator: activeUser.username
        });

        // Hiện thông báo thành công Tiếng Anh
        showToast(`Created resident @${username} successfully!`, 'success');
        closeDialog();
        
        // Cập nhật lại mảng dữ liệu và vẽ lại giao diện bảng
        await loadUsers();
      } catch (err) {
        // Bắt lỗi trùng tên đăng nhập: "Username already exists!"
        showToast(err.message, 'error');
      }
    });
  }
}
