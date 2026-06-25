import { UsersAPI } from '../api.js';

export class UsersManager {
  static async render(container, currentUser, showToast) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--text-muted);">Loading users...</div>`;
    let users = [];
    try { users = await UsersAPI.getAll(); } catch(e) { showToast(e.message,'error'); }
    this._draw(container, users, currentUser, showToast);
  }

  static _draw(container, users, currentUser, showToast) {
    container.innerHTML = `
      <div class="chart-card" style="margin-bottom:20px;">
        <div class="card-header">
          <div><h2 class="card-title">User Management</h2><p class="card-title-muted">${users.length} account(s) registered</p></div>
          <button class="btn btn-primary btn-sm" id="btn-add-user">+ Add User</button>
        </div>
        <div style="overflow-x:auto;margin-top:16px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-glass);">
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Username</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Full Name</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Room</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Phone</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Role</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Actions</th>
            </tr></thead>
            <tbody>
              ${users.map(u => `
                <tr style="border-bottom:1px solid var(--border-glass);transition:var(--transition-fast);" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:10px;font-weight:600;color:var(--color-primary);">@${u.username}</td>
                  <td style="padding:10px;">${u.fullname}</td>
                  <td style="padding:10px;">${u.room}</td>
                  <td style="padding:10px;">${u.phone}</td>
                  <td style="padding:10px;"><span class="role-badge ${u.role==='admin'?'role-admin':'role-user'}">${u.role}</span></td>
                  <td style="padding:10px;display:flex;gap:6px;flex-wrap:wrap;">
                    ${u.username !== currentUser.username && u.username !== 'admin' ? `
                      <button class="btn btn-sm" style="background:var(--color-warning-light);color:var(--color-warning);border:1px solid var(--color-warning);" onclick="window.__userAction('role','${u.username}','${u.role}')">Role</button>
                      <button class="btn btn-sm" style="background:var(--color-accent-light);color:var(--color-accent);border:1px solid var(--color-accent);" onclick="window.__userAction('reset','${u.username}')">Reset Pwd</button>
                      <button class="btn btn-sm" style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);" onclick="window.__userAction('delete','${u.username}')">Delete</button>
                    ` : '<span style="color:var(--text-muted);font-size:12px;">Protected</span>'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-add-user').onclick = () => this._showAddForm(container, currentUser, showToast);

    window.__userAction = async (action, username, extra) => {
      try {
        if (action === 'delete') {
          if (!confirm(`Delete @${username}? This cannot be undone.`)) return;
          await UsersAPI.delete(username);
          showToast(`User @${username} deleted.`, 'success');
        } else if (action === 'role') {
          const newRole = extra === 'admin' ? 'user' : 'admin';
          if (!confirm(`Change @${username} role to "${newRole}"?`)) return;
          await UsersAPI.updateRole(username, newRole);
          showToast(`Role updated to ${newRole}.`, 'success');
        } else if (action === 'reset') {
          const pw = prompt(`New password for @${username} (min 6 chars):`);
          if (!pw || pw.length < 6) { showToast('Password too short!','error'); return; }
          await UsersAPI.resetPassword(username, pw);
          showToast(`Password reset for @${username}.`, 'success');
        }
        await this.render(container, currentUser, showToast);
      } catch(e) { showToast(e.message, 'error'); }
    };
  }

  static _showAddForm(container, currentUser, showToast) {
    const fields = [
      ['username','Username *','text'], ['password','Password *','password'],
      ['fullname','Full Name *','text'], ['room','Room *','text'],
      ['phone','Phone *','tel'], ['householdCode','Household Code *','text'],
      ['householdHeadName','Head of Household *','text'], ['houseNo','House No *','text'],
      ['street','Street *','text'], ['ward','Ward *','text'], ['district','District *','text'],
      ['alias','Alias *','text'], ['dob','Date of Birth *','date'], ['birthPlace','Birth Place *','text'],
      ['hometown','Hometown *','text'], ['ethnicity','Ethnicity *','text'],
      ['occupation','Occupation *','text'], ['workplace','Workplace *','text'],
      ['identityNo','Citizen ID *','text'], ['issueDate','Issue Date *','date'],
      ['issuePlace','Issue Place *','text'], ['previousResidence','Previous Residence *','text']
    ];

    const formHtml = `
      <div class="chart-card">
        <div class="card-header">
          <div><h2 class="card-title">Add New User</h2></div>
          <button class="btn btn-sm" id="btn-cancel-add" style="background:var(--bg-tertiary);color:var(--text-secondary);">Cancel</button>
        </div>
        <form id="add-user-form" style="margin-top:16px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Role</label>
              <select class="form-control" id="fu-role"><option value="user">Resident</option><option value="admin">Admin</option></select>
            </div>
            ${fields.map(([id,label,type]) => `
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">${label}</label>
                <input type="${type}" class="form-control" id="fu-${id}" placeholder="${label.replace(' *','')}" ${id==='password'?'minlength="6"':''} required>
              </div>`).join('')}
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:16px;width:100%;" id="btn-submit-user">Create User</button>
        </form>
      </div>`;

    container.innerHTML = formHtml;
    document.getElementById('btn-cancel-add').onclick = () => this.render(container, currentUser, showToast);
    document.getElementById('add-user-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-user');
      btn.textContent = 'Creating...'; btn.disabled = true;
      const data = {};
      ['username','password','fullname','room','phone','householdCode','householdHeadName',
       'houseNo','street','ward','district','alias','dob','birthPlace','hometown','ethnicity',
       'occupation','workplace','identityNo','issueDate','issuePlace','previousResidence'].forEach(k => {
        data[k] = document.getElementById(`fu-${k}`)?.value || '';
      });
      data.role = document.getElementById('fu-role').value;
      try {
        await UsersAPI.create(data);
        showToast('User created successfully!', 'success');
        await this.render(container, currentUser, showToast);
      } catch(err) {
        showToast(err.message, 'error');
        btn.textContent = 'Create User'; btn.disabled = false;
      }
    };
  }
}
