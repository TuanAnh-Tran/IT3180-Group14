import { AuthService } from '../auth.js';

/**
 * THÀNH PHẦN HỒ SƠ CÁ NHÂN (ProfileView Component)
 * Hiển thị thẻ thông tin cá nhân, cho phép cư dân tự cập nhật họ tên, số điện thoại
 * và thực hiện đổi mật khẩu bảo mật nhiều lớp.
 * Giao diện hiển thị Tiếng Anh, chú thích bằng Tiếng Việt.
 */
export class ProfileView {
  static render(container, user, showToast, onProfileUpdate) {
    if (!user) {
      container.innerHTML = '';
      return;
    }

    // Tách ký tự cuối cùng của tên làm Avatar
    const initial = user.fullname ? user.fullname.trim().split(' ').pop().charAt(0).toUpperCase() : '?';
    const roleText = user.role === 'admin' ? 'System Admin' : 'Resident';
    const roleClass = user.role === 'admin' ? 'role-admin' : 'role-user';

    // Xuất nội dung HTML giao diện Tiếng Anh vào Container
    container.innerHTML = `
      <div class="profile-card-layout">
        <!-- Thẻ tóm tắt thông tin cá nhân bên trái (Profile Overview Card) -->
        <div class="profile-sidebar-card">
          <div class="profile-avatar-big">${initial}</div>
          <h2 class="profile-title-name">${user.fullname}</h2>
          <div class="profile-role-display">
            <span class="role-badge ${roleClass}">${roleText}</span>
          </div>
          
          <div class="profile-meta-details">
            <div class="profile-meta-row">
              <span class="profile-meta-label">Username:</span>
              <span class="profile-meta-value" style="color: var(--color-accent);">@${user.username}</span>
            </div>
            <div class="profile-meta-row">
              <span class="profile-meta-label">Room Number:</span>
              <span class="profile-meta-value">${user.room}</span>
            </div>
            <div class="profile-meta-row">
              <span class="profile-meta-label">Phone:</span>
              <span class="profile-meta-value">${user.phone}</span>
            </div>
          </div>
        </div>

        <!-- Khung điền các Biểu mẫu thiết lập bên phải (Forms Panel) -->
        <div class="profile-form-panel">
          <!-- Form 1: Cập nhật thông tin liên hệ (Update Info Form) -->
          <div>
            <h3 class="panel-section-title" style="margin-bottom: 20px;">Update Contact Information</h3>
            <form id="update-profile-form">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Full Name <span style="color: var(--color-danger);">*</span></label>
                  <div class="input-wrapper">
                    <span class="input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </span>
                    <input type="text" class="form-control" name="fullname" value="${user.fullname}" required placeholder="Full Name">
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
                    <input type="tel" class="form-control" name="phone" value="${user.phone}" placeholder="Not updated yet">
                  </div>
                </div>
              </div>

              <!-- Admin được sửa mã căn hộ thoải mái, Resident thường bị khóa (Chỉ đọc) -->
              <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label">Room Number ${user.role === 'admin' ? '' : '<span style="color: var(--text-muted); font-size: 11px;">(Contact Management Office to change)</span>'}</label>
                <div class="input-wrapper">
                  <span class="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75" />
                    </svg>
                  </span>
                  <input type="text" class="form-control" name="room" value="${user.room}" ${user.role !== 'admin' ? 'readonly style="opacity: 0.6; cursor: not-allowed;"' : ''} placeholder="Room Number">
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: auto;">
                Save Contact Details
              </button>
            </form>
          </div>

          <!-- Form 2: Thay đổi mật khẩu bảo mật (Change Password Form) -->
          <div>
            <h3 class="panel-section-title" style="margin-bottom: 20px;">Change Account Password</h3>
            <form id="change-password-form">
              <div class="form-group">
                <label class="form-label">Current Password <span style="color: var(--color-danger);">*</span></label>
                <div class="input-wrapper">
                  <span class="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input type="password" class="form-control" name="oldPassword" required placeholder="Enter currently active password">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">New Password <span style="color: var(--color-danger);">*</span></label>
                  <div class="input-wrapper">
                    <span class="input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </span>
                    <input type="password" class="form-control" name="newPassword" required placeholder="Min 6 characters" minlength="6">
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Confirm New Password <span style="color: var(--color-danger);">*</span></label>
                  <div class="input-wrapper">
                    <span class="input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                    </span>
                    <input type="password" class="form-control" name="confirmPassword" required placeholder="Confirm new password" minlength="6">
                  </div>
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: auto;">
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    // Lắng nghe submit form cập nhật thông tin liên hệ
    const updateForm = container.querySelector('#update-profile-form');
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(updateForm);
      const fullname = formData.get('fullname').trim();
      const phone = formData.get('phone').trim();
      const room = formData.get('room').trim();

      try {
        const updated = await AuthService.updateProfile(fullname, phone, room);
        showToast('Profile details updated successfully!', 'success');
        // Kích hoạt callback đồng bộ hóa thông tin người dùng lên Header và Sidebar
        onProfileUpdate(updated);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Lắng nghe submit form thay đổi mật khẩu bảo mật
    const passForm = container.querySelector('#change-password-form');
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(passForm);
      const oldPassword = formData.get('oldPassword');
      const newPassword = formData.get('newPassword');
      const confirmPassword = formData.get('confirmPassword');

      // Kiểm tra mật khẩu gõ lại có khớp hay không
      if (newPassword !== confirmPassword) {
        showToast('Confirm password does not match new password!', 'warning');
        return;
      }

      try {
        // Thực thi thay đổi mật khẩu (Sẽ tự động đối chiếu băm SHA-256 mật khẩu cũ)
        await AuthService.changePassword(oldPassword, newPassword);
        showToast('Password changed successfully! New credentials saved securely.', 'success');
        passForm.reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}
