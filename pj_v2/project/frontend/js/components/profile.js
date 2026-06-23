import { AuthAPI } from '../api.js';
import { ApartmentDB } from '../db.js';

export class ProfileView {
  static async render(container, user, showToast, onUpdated) {
    let fullUser = user;
    try {
      const fresh = await AuthAPI.getMe();
      if (fresh) fullUser = fresh;
    } catch(e) {}

    const fields = [
      ['fullname','Full Name','text',fullUser.fullname],
      ['phone','Phone','tel',fullUser.phone],
      ['room','Room','text',fullUser.room],
      ['householdCode','Household Code','text',fullUser.householdCode||''],
      ['householdHeadName','Head of Household','text',fullUser.householdHeadName||''],
      ['houseNo','House No','text',fullUser.houseNo||''],
      ['street','Street','text',fullUser.street||''],
      ['ward','Ward','text',fullUser.ward||''],
      ['district','District','text',fullUser.district||''],
      ['alias','Alias','text',fullUser.alias||''],
      ['dob','Date of Birth','date',fullUser.dob||''],
      ['birthPlace','Birth Place','text',fullUser.birthPlace||''],
      ['hometown','Hometown','text',fullUser.hometown||''],
      ['ethnicity','Ethnicity','text',fullUser.ethnicity||''],
      ['occupation','Occupation','text',fullUser.occupation||''],
      ['workplace','Workplace','text',fullUser.workplace||''],
      ['identityNo','Citizen ID (CCCD)','text',fullUser.identityNo||''],
      ['issueDate','Issue Date','date',fullUser.issueDate||''],
      ['issuePlace','Issue Place','text',fullUser.issuePlace||''],
      ['previousResidence','Previous Residence','text',fullUser.previousResidence||''],
    ];

    container.innerHTML = `
      <div class="chart-card" style="margin-bottom:20px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">My Profile</h2>
            <p class="card-title-muted">Account: @${fullUser.username} — <span class="role-badge ${fullUser.role==='admin'?'role-admin':'role-user'}">${fullUser.role}</span></p>
          </div>
        </div>
        <form id="profile-form" style="margin-top:16px;">
          <h3 style="font-size:12px;color:var(--color-primary);margin:0 0 12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Personal & Household Info</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px;">
            ${fields.map(([id,label,type,val]) => `
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">${label} *</label>
                <input type="${type}" class="form-control" id="pf-${id}" value="${val}" required>
              </div>`).join('')}
          </div>
          <button type="submit" class="btn btn-primary" id="btn-save-profile">Save Changes</button>
        </form>
      </div>

      <div class="chart-card">
        <div class="card-header"><div><h2 class="card-title">Change Password</h2></div></div>
        <form id="pw-form" style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Current Password</label>
            <input type="password" class="form-control" id="pw-old" placeholder="Current password" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">New Password</label>
            <input type="password" class="form-control" id="pw-new" placeholder="Min 6 characters" minlength="6" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Confirm New Password</label>
            <input type="password" class="form-control" id="pw-confirm" placeholder="Re-enter new password" required>
          </div>
          <div>
            <button type="submit" class="btn btn-primary" id="btn-change-pw">Change Password</button>
          </div>
        </form>
      </div>`;

    document.getElementById('profile-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-profile');
      btn.textContent = 'Saving...'; btn.disabled = true;
      const data = {};
      fields.forEach(([id]) => { data[id] = document.getElementById(`pf-${id}`)?.value || ''; });
      try {
        const updated = await AuthAPI.updateProfile(data);
        showToast('Profile updated successfully!', 'success');
        if (onUpdated) onUpdated(updated);
        await this.render(container, updated, showToast, onUpdated);
      } catch(err) {
        showToast(err.message, 'error');
        btn.textContent = 'Save Changes'; btn.disabled = false;
      }
    };

    document.getElementById('pw-form').onsubmit = async (e) => {
      e.preventDefault();
      const oldPw = document.getElementById('pw-old').value;
      const newPw = document.getElementById('pw-new').value;
      const cfPw  = document.getElementById('pw-confirm').value;
      if (newPw !== cfPw) { showToast('Passwords do not match!', 'error'); return; }
      const btn = document.getElementById('btn-change-pw');
      btn.textContent = 'Changing...'; btn.disabled = true;
      try {
        await AuthAPI.changePassword(oldPw, newPw);
        showToast('Password changed successfully!', 'success');
        document.getElementById('pw-form').reset();
      } catch(err) { showToast(err.message, 'error'); }
      finally { btn.textContent = 'Change Password'; btn.disabled = false; }
    };
  }
}
