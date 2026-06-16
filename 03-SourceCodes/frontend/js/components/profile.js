import { AuthService } from '../auth.js';
import { ApartmentDB } from '../db.js';

/**
 * THÀNH PHẦN HỒ SƠ CÁ NHÂN (ProfileView Component)
 * Hiển thị thẻ thông tin cá nhân, cho phép cư dân tự cập nhật các thông tin chi tiết
 * bao gồm Hộ Khẩu, Nhân Khẩu và thực hiện đổi mật khẩu bảo mật.
 * Giao diện hiển thị Tiếng Anh, chú thích bằng Tiếng Việt.
 */
export class ProfileView {
  static async render(container, sessionUser, showToast, onProfileUpdate) {
    if (!sessionUser) {
      container.innerHTML = '';
      return;
    }

    // Tải thông tin tài khoản đầy đủ, mới nhất từ Database giả lập
    const user = await ApartmentDB.getUserByUsername(sessionUser.username);
    if (!user) {
      container.innerHTML = '<div class="chart-card"><p style="color:var(--text-secondary);">User data not found.</p></div>';
      return;
    }

    // Tách ký tự cuối cùng của tên làm Avatar
    const initial = user.fullname ? user.fullname.trim().split(' ').pop().charAt(0).toUpperCase() : '?';
    const roleText = user.role === 'admin' ? 'System Admin' : (user.role === 'accountant' ? 'Financial Accountant' : 'Resident');
    const roleClass = user.role === 'admin' ? 'role-admin' : (user.role === 'accountant' ? 'role-accountant' : 'role-user');

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
              <span class="profile-meta-label">Citizen ID (CCCD):</span>
              <span class="profile-meta-value">${user.identityNo || '-'}</span>
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
          <!-- Form 1: Cập nhật thông tin chi tiết (Update Info Form) -->
          <div>
            <h3 class="panel-section-title" style="margin-bottom: 20px;">Update Profile Details</h3>
            <form id="update-profile-form">
              <div style="display:grid; grid-template-columns: 1fr; gap: 20px;">
                
                <!-- Nhóm 1: Liên hệ & Phòng ban -->
                <div style="background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:12px; padding:16px;">
                  <h4 style="margin:0 0 12px; color:var(--color-primary); font-size:13px; text-transform:uppercase; font-weight:700;">1. Contact & Room</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Full Name *</label>
                      <input type="text" class="form-control" name="fullname" value="${user.fullname}" required placeholder="Full Name" style="padding-left:14px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Phone Number *</label>
                      <input type="tel" class="form-control" name="phone" value="${user.phone}" pattern="\\d+" title="Only digits allowed" required placeholder="Phone Number" style="padding-left:14px;">
                    </div>

                    <!-- Admin được sửa mã căn hộ thoải mái, Resident thường bị khóa (Chỉ đọc) -->
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Room Number * ${user.role === 'admin' ? '' : '<span style="color: var(--text-muted); font-size: 10px;">(Read-only)</span>'}</label>
                      <input type="text" class="form-control" name="room" value="${user.room}" ${user.role !== 'admin' ? 'readonly style="opacity: 0.6; cursor: not-allowed;"' : ''} required placeholder="Room Number" style="padding-left:14px;">
                    </div>
                  </div>
                </div>

                <!-- Nhóm 2: Sổ Hộ Khẩu -->
                <div style="background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:12px; padding:16px;">
                  <h4 style="margin:0 0 12px; color:var(--color-accent); font-size:13px; text-transform:uppercase; font-weight:700;">2. Household Registration (Sổ hộ khẩu)</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Household Code *</label>
                      <input type="text" class="form-control" name="householdCode" value="${user.householdCode || ''}" required placeholder="Household Code" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Head of Household Name *</label>
                      <input type="text" class="form-control" name="householdHeadName" value="${user.householdHeadName || ''}" required placeholder="Head of Household" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">House Number *</label>
                      <input type="text" class="form-control" name="houseNo" value="${user.houseNo || ''}" required placeholder="House Number" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Street / Hamlet *</label>
                      <input type="text" class="form-control" name="street" value="${user.street || ''}" required placeholder="Street" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Ward / Commune *</label>
                      <input type="text" class="form-control" name="ward" value="${user.ward || ''}" required placeholder="Ward" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">District *</label>
                      <input type="text" class="form-control" name="district" value="${user.district || ''}" required placeholder="District" style="padding-left:14px;">
                    </div>
                  </div>
                </div>

                <!-- Nhóm 3: Nhân Khẩu -->
                <div style="background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:12px; padding:16px;">
                  <h4 style="margin:0 0 12px; color:var(--color-success); font-size:13px; text-transform:uppercase; font-weight:700;">3. Identity & Resident Details</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Alias *</label>
                      <input type="text" class="form-control" name="alias" value="${user.alias || ''}" required placeholder="Alias or N/A" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Citizen ID (CCCD/CMND) *</label>
                      <input type="text" class="form-control" name="identityNo" value="${user.identityNo || ''}" required pattern="\\d+" title="Only digits allowed" placeholder="CCCD" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Date of Birth *</label>
                      <input type="date" class="form-control" name="dob" value="${user.dob || ''}" required style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Birth Place *</label>
                      <input type="text" class="form-control" name="birthPlace" value="${user.birthPlace || ''}" required placeholder="Birth Place" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Hometown (Nguyên quán) *</label>
                      <input type="text" class="form-control" name="hometown" value="${user.hometown || ''}" required placeholder="Hometown" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Ethnicity *</label>
                      <input type="text" class="form-control" name="ethnicity" value="${user.ethnicity || ''}" required placeholder="e.g. Kinh" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Occupation *</label>
                      <input type="text" class="form-control" name="occupation" value="${user.occupation || ''}" required placeholder="Occupation" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Workplace *</label>
                      <input type="text" class="form-control" name="workplace" value="${user.workplace || ''}" required placeholder="Workplace" style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Issue Date *</label>
                      <input type="date" class="form-control" name="issueDate" value="${user.issueDate || ''}" required style="padding-left:14px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Issue Place *</label>
                      <input type="text" class="form-control" name="issuePlace" value="${user.issuePlace || ''}" required placeholder="Issue Place" style="padding-left:14px;">
                    </div>
                  </div>
                  <div class="form-group" style="margin-top: 12px; margin-bottom: 0;">
                    <label class="form-label">Previous Residence Info *</label>
                    <input type="text" class="form-control" name="previousResidence" value="${user.previousResidence || ''}" required placeholder="Previous address info" style="padding-left:14px;">
                  </div>
                </div>

              </div>
              
              <button type="submit" class="btn btn-primary" style="width: auto; margin-top: 10px;">
                Save Profile Details
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

    // Lắng nghe submit form cập nhật thông tin chi tiết
    const updateForm = container.querySelector('#update-profile-form');
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(updateForm);
      
      const fullname = formData.get('fullname').trim();
      const phone = formData.get('phone').trim();
      const room = formData.get('room').trim();
      
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

      // Kiểm tra hợp lệ dữ liệu
      if (!/^\d+$/.test(phone)) {
        showToast('Phone number must contain only digits!', 'warning');
        return;
      }
      if (!/^\d+$/.test(identityNo)) {
        showToast('Citizen ID (CCCD/CMND) must contain only digits!', 'warning');
        return;
      }

      try {
        const updated = await AuthService.updateProfile({
          fullname, phone, room,
          householdCode, householdHeadName, houseNo, street, ward, district,
          alias, dob, birthPlace, hometown, ethnicity, occupation, workplace,
          identityNo, issueDate, issuePlace, previousResidence
        });
        showToast('Profile details updated successfully!', 'success');
        // Kích hoạt callback đồng bộ hóa thông tin người dùng lên Header và Sidebar
        onProfileUpdate(updated);
        // Vẽ lại giao diện hồ sơ với thông tin mới
        ProfileView.render(container, updated, showToast, onProfileUpdate);
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
