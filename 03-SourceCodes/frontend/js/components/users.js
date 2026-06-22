import { API } from '../api.js?v=3';
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
        <div class="dialog-box" style="max-width: 780px; width: 95%;">
          <div class="dialog-header">
            <h2 class="dialog-title">Add Resident Account</h2>
            <button class="btn-close-dialog" id="btn-close-create-dialog">&times;</button>
          </div>
          <form id="create-user-form">
            <div style="display:grid; grid-template-columns: 1fr; gap: 16px; max-height:60vh; overflow-y:auto; padding-right:8px; margin-bottom:20px;">
              
              <!-- Section 1: Credentials -->
              <div style="background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:10px; padding:14px;">
                <h4 style="margin:0 0 10px; color:var(--color-primary); font-size:12px; text-transform:uppercase;">1. Credentials & Role</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Username *</label>
                    <input type="text" class="form-control" name="username" required placeholder="e.g. nguyenan" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Password *</label>
                    <input type="password" class="form-control" name="password" required placeholder="Min 6 chars" minlength="6" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Role *</label>
                    <select class="select-filter" name="role" style="width:100%; height:42px;">
                      <option value="user">Resident</option>
                      <option value="accountant">Accountant</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Room Number *</label>
                    <input type="text" class="form-control" name="room" required placeholder="e.g. A1201" style="padding-left:14px;">
                  </div>
                </div>
              </div>

              <!-- Section 2: Household Info -->
              <div style="background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:10px; padding:14px;">
                <h4 style="margin:0 0 10px; color:var(--color-accent); font-size:12px; text-transform:uppercase;">2. Household Registration (Sổ hộ khẩu)</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Household Code *</label>
                    <input type="text" class="form-control" name="householdCode" required placeholder="e.g. HH-A1201" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Head of Household *</label>
                    <input type="text" class="form-control" name="householdHeadName" required placeholder="e.g. Nguyen Van An" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">House Number *</label>
                    <input type="text" class="form-control" name="houseNo" required placeholder="e.g. A1201" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Street / Hamlet *</label>
                    <input type="text" class="form-control" name="street" required placeholder="e.g. BlueMoon St" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Ward / Commune *</label>
                    <input type="text" class="form-control" name="ward" required placeholder="e.g. Me Tri Ward" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">District *</label>
                    <input type="text" class="form-control" name="district" required placeholder="e.g. Nam Tu Liem" style="padding-left:14px;">
                  </div>
                </div>
              </div>

              <!-- Section 3: Personal Resident Details -->
              <div style="background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:10px; padding:14px;">
                <h4 style="margin:0 0 10px; color:var(--color-success); font-size:12px; text-transform:uppercase;">3. Identity & Resident Details</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Full Name *</label>
                    <input type="text" class="form-control" name="fullname" required placeholder="Full Name" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Alias *</label>
                    <input type="text" class="form-control" name="alias" required placeholder="Alias or N/A" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Citizen ID (CCCD/CMND) *</label>
                    <input type="text" class="form-control" name="identityNo" required placeholder="Digits only" pattern="\d+" title="Only digits allowed" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Phone Number *</label>
                    <input type="tel" class="form-control" name="phone" required placeholder="Digits only" pattern="\d+" title="Only digits allowed" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Date of Birth *</label>
                    <input type="date" class="form-control" name="dob" required style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Birth Place *</label>
                    <input type="text" class="form-control" name="birthPlace" required placeholder="Place of birth" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Hometown *</label>
                    <input type="text" class="form-control" name="hometown" required placeholder="Hometown" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Ethnicity *</label>
                    <input type="text" class="form-control" name="ethnicity" required placeholder="e.g. Kinh" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Occupation *</label>
                    <input type="text" class="form-control" name="occupation" required placeholder="Occupation" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Workplace *</label>
                    <input type="text" class="form-control" name="workplace" required placeholder="Company / school" style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Issue Date *</label>
                    <input type="date" class="form-control" name="issueDate" required style="padding-left:14px;">
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Issue Place *</label>
                    <input type="text" class="form-control" name="issuePlace" required placeholder="Issue place" style="padding-left:14px;">
                  </div>
                </div>
                <div class="form-group" style="margin-top:12px; margin-bottom:0;">
                  <label class="form-label">Previous Residence Info *</label>
                  <input type="text" class="form-control" name="previousResidence" required placeholder="Previous address" style="padding-left:14px;">
                </div>
              </div>
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
        const nameVal = (user.fullName || user.fullname || '').toLowerCase();
        const usernameVal = (user.username || '').toLowerCase();
        const roomVal = (user.room || '').toLowerCase();
        const phoneVal = (user.phone || '').toLowerCase();
        const searchVal = (searchQuery || '').toLowerCase();

        const matchesSearch = 
          nameVal.includes(searchVal) ||
          usernameVal.includes(searchVal) ||
          roomVal.includes(searchVal) ||
          phoneVal.includes(searchVal);
          
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
        const uUsername = user.username || '';
        const aUsername = activeUser.username || '';
        const isCurrent = uUsername.toLowerCase() === aUsername.toLowerCase();
        const isSuperAdmin = uUsername.toLowerCase() === 'admin';
        
        const displayName = user.fullName || user.fullname || '';
        const initial = displayName.trim() ? displayName.trim().split(' ').pop().charAt(0).toUpperCase() : 'U';
        const uRoom = user.room || '-';
        const uPhone = user.phone || '-';

        return `
          <tr data-username="${uUsername}">
            <td>
              <div class="user-cell">
                <div class="user-cell-avatar">${initial}</div>
                <div class="user-cell-details">
                  <div class="user-cell-fullname">${displayName} ${isCurrent ? '<span style="color: var(--color-primary); font-size: 11px; font-weight: normal;">(You)</span>' : ''}</div>
                  <div class="user-cell-username">@${uUsername}</div>
                </div>
              </div>
            </td>
            <td>${uRoom}</td>
            <td>${uPhone}</td>
            <td>
              ${isSuperAdmin || isCurrent ? `
                <span class="role-badge ${user.role === 'admin' ? 'role-admin' : (user.role === 'accountant' ? 'role-accountant' : 'role-user')}">
                  ${user.role === 'admin' ? 'Admin' : (user.role === 'accountant' ? 'Accountant' : 'Resident')}
                </span>
                ${user.status === 'PENDING' ? '<span style="display:block; margin-top:4px; font-size:11px; color:var(--color-warning); font-weight:bold;">PENDING</span>' : ''}
                ${user.status === 'LOCKED' ? '<span style="display:block; margin-top:4px; font-size:11px; color:var(--color-danger); font-weight:bold;">LOCKED</span>' : ''}
              ` : `
                <select class="table-role-select" data-username="${uUsername}">
                  <option value="user" ${user.role === 'user' ? 'selected' : ''}>Resident</option>
                  <option value="accountant" ${user.role === 'accountant' ? 'selected' : ''}>Accountant</option>
                  <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>System Admin</option>
                </select>
                ${user.status === 'PENDING' ? '<span style="display:block; margin-top:4px; font-size:11px; color:var(--color-warning); font-weight:bold;">PENDING</span>' : ''}
                ${user.status === 'LOCKED' ? '<span style="display:block; margin-top:4px; font-size:11px; color:var(--color-danger); font-weight:bold;">LOCKED</span>' : ''}
              `}
            </td>
            <td style="text-align: center;">
              ${user.status === 'LOCKED' ? `
                <div class="table-actions" style="justify-content: center;">
                  <button class="btn-icon btn-icon-unlock" data-username="${uUsername}" title="Unlock Account" style="color: var(--color-success); border: 1px solid var(--color-success); margin-right: 4px;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </button>
                  ${isSuperAdmin || isCurrent ? '' : `
                    <button class="btn-icon btn-icon-delete" data-username="${uUsername}" title="Delete Account" style="color: var(--color-danger); border: 1px solid var(--color-danger);">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  `}
                </div>
              ` : (isSuperAdmin || isCurrent ? `
                <span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Protected</span>
              ` : (user.status === 'PENDING' ? `
                <div class="table-actions" style="justify-content: center;">
                  <button class="btn-icon btn-icon-approve" data-username="${uUsername}" title="Approve Account" style="color: var(--color-success); border: 1px solid var(--color-success); margin-right: 4px;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                  <button class="btn-icon btn-icon-delete" data-username="${uUsername}" title="Reject Account" style="color: var(--color-danger); border: 1px solid var(--color-danger);">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ` : `
                <div class="table-actions" style="justify-content: center;">
                  <button class="btn-icon btn-icon-delete" data-username="${uUsername}" title="Delete Account">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              `))}
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
            await API.updateUserRole(username, newRole);
            const roleLabels = { admin: 'Admin', accountant: 'Accountant', user: 'Resident' };
            showToast(`Changed @${username}'s role to ${roleLabels[newRole]}!`, 'success');
            // Tải lại mảng cư dân từ DB và kết xuất lại bảng
            usersList = await API.getUsers();
            updateTable();
          } catch (err) {
            showToast(err.message, 'error');
            updateTable();
          }
        });
      });

      // Lắng nghe sự kiện click nút Approve
      tbody.querySelectorAll('.btn-icon-approve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const username = btn.getAttribute('data-username');
          if (confirm(`Approve registration for @${username}?`)) {
            try {
              await API.approveUser(username);
              showToast(`Account @${username} approved!`, 'success');
              usersList = await API.getUsers();
              updateTable();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });

      // Lắng nghe sự kiện click nút Unlock
      tbody.querySelectorAll('.btn-icon-unlock').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const username = btn.getAttribute('data-username');
          if (confirm(`Unlock account for @${username}?`)) {
            try {
              await API.unlockUser(username);
              showToast(`Account @${username} unlocked!`, 'success');
              usersList = await API.getUsers();
              updateTable();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });

      // Lắng nghe sự kiện click nút Xóa tài khoản / Reject
      tbody.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const username = btn.getAttribute('data-username');
          if (confirm(`Are you sure you want to DELETE resident @${username} from the system? This action is permanent and cannot be undone!`)) {
            try {
              await API.deleteUser(username);
              showToast(`Deleted account @${username} successfully!`, 'success');
              // Tải lại danh sách
              usersList = await API.getUsers();
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
      usersList = await API.getUsers();
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
      
      const householdCode = formData.get('householdCode').trim();
      const householdHeadName = formData.get('householdHeadName').trim();
      const houseNo = formData.get('houseNo').trim();
      const street = formData.get('street').trim();
      const ward = formData.get('ward').trim();
      const district = formData.get('district').trim();
      
      const alias = formData.get('alias').trim();
      const dob = formData.get('dob').trim();
      const birthPlace = formData.get('birthPlace').trim();
      const hometown = formData.get('hometown').trim();
      const ethnicity = formData.get('ethnicity').trim();
      const occupation = formData.get('occupation').trim();
      const workplace = formData.get('workplace').trim();
      const identityNo = formData.get('identityNo').trim();
      const issueDate = formData.get('issueDate').trim();
      const issuePlace = formData.get('issuePlace').trim();
      const previousResidence = formData.get('previousResidence').trim();

      // Các kiểm tra hợp lệ tại client
      if (username.length < 4) {
        showToast('Username must be at least 4 characters long!', 'warning');
        return;
      }
      if (password.length < 6) {
        showToast('Default password must be at least 6 characters long!', 'warning');
        return;
      }
      if (!/^0\d{9}$/.test(phone)) {
        showToast('Phone number must start with 0 and contain exactly 10 digits!', 'warning');
        return;
      }
      if (!/^\d{12}$/.test(identityNo)) {
        showToast('Citizen ID (CCCD) must contain exactly 12 digits!', 'warning');
        return;
      }

      try {
        await API.createUser({
          username,
          passwordHash: password, // The backend will hash it if we send plain password
          fullName: fullname, // Note: match the backend User entity field names or DTO. The controller accepts User object.
          room,
          phone,
          role,
          identityNo
        });
        // Hiện thông báo thành công Tiếng Anh
        showToast(`Created resident @${username} successfully!`, 'success');
        closeDialog();
        
        // Cập nhật lại mảng dữ liệu và vẽ lại giao diện bảng
        await loadUsers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}
