import { ResidentsAPI, FeesAPI } from '../api.js';

export class ResidentsManager {
  static async render(container, user, showToast) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--text-muted);">Loading...</div>`;
    let residents = [], households = [];
    try {
      [residents, households] = await Promise.all([ResidentsAPI.getAll(), FeesAPI.getHouseholds()]);
    } catch(e) { showToast(e.message,'error'); }

    const isAdmin = user.role === 'admin';

    container.innerHTML = `
      <div class="chart-card">
        <div class="card-header">
          <div><h2 class="card-title">${isAdmin ? 'Resident Manager' : 'My Household'}</h2><p class="card-title-muted">${residents.length} resident(s) registered</p></div>
          ${isAdmin ? '<button class="btn btn-primary btn-sm" id="btn-add-res">+ Add Resident</button>' : ''}
        </div>
        <div style="overflow-x:auto;margin-top:16px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-glass);">
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Name</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Household</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">DOB</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Gender</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Relationship</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Phone</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Occupation</th>
              ${isAdmin ? '<th style="padding:10px;text-align:left;color:var(--text-muted);font-weight:500;">Actions</th>' : ''}
            </tr></thead>
            <tbody>
              ${residents.map(r => `
                <tr style="border-bottom:1px solid var(--border-glass);" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:10px;font-weight:600;">${r.fullName}</td>
                  <td style="padding:10px;color:var(--color-accent);">${r.householdId}</td>
                  <td style="padding:10px;">${r.dob||'—'}</td>
                  <td style="padding:10px;">${r.gender||'—'}</td>
                  <td style="padding:10px;">${r.relationship||'—'}</td>
                  <td style="padding:10px;">${r.phone||'—'}</td>
                  <td style="padding:10px;">${r.occupation||'—'}</td>
                  ${isAdmin ? `<td style="padding:10px;">
                    <button class="btn btn-sm" style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);" onclick="window.__resDelete('${r.id}')">Delete</button>
                  </td>` : ''}
                </tr>`).join('')}
              ${residents.length === 0 ? `<tr><td colspan="8" style="padding:20px;text-align:center;color:var(--text-muted);">No residents found.</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>`;

    if (isAdmin) {
      document.getElementById('btn-add-res').onclick = () => this._showForm(container, user, showToast, households);
      window.__resDelete = async (id) => {
        if (!confirm('Delete this resident?')) return;
        try { await ResidentsAPI.delete(id); showToast('Deleted.','success'); await this.render(container,user,showToast); }
        catch(e) { showToast(e.message,'error'); }
      };
    }
  }

  static _showForm(container, user, showToast, households) {
    container.innerHTML = `
      <div class="chart-card">
        <div class="card-header">
          <div><h2 class="card-title">Add Resident</h2></div>
          <button class="btn btn-sm" id="btn-cancel-res" style="background:var(--bg-tertiary);color:var(--text-secondary);">Cancel</button>
        </div>
        <form id="res-form" style="margin-top:16px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Household *</label>
              <select class="form-control" id="r-householdId" required>
                ${households.map(h=>`<option value="${h.id}">${h.id} — ${h.ownerName}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Full Name *</label><input type="text" class="form-control" id="r-fullName" required></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Date of Birth</label><input type="date" class="form-control" id="r-dob"></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Gender</label><select class="form-control" id="r-gender"><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Relationship</label><input type="text" class="form-control" id="r-relationship" placeholder="e.g. Chủ hộ, Vợ, Con"></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Citizen ID</label><input type="text" class="form-control" id="r-identityNo"></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Phone</label><input type="tel" class="form-control" id="r-phone"></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Occupation</label><input type="text" class="form-control" id="r-occupation"></div>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:16px;width:100%;" id="btn-submit-res">Add Resident</button>
        </form>
      </div>`;

    document.getElementById('btn-cancel-res').onclick = () => this.render(container,user,showToast);
    document.getElementById('res-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-res');
      btn.textContent='Adding...'; btn.disabled=true;
      const data = {
        householdId: document.getElementById('r-householdId').value,
        fullName: document.getElementById('r-fullName').value,
        dob: document.getElementById('r-dob').value,
        gender: document.getElementById('r-gender').value,
        relationship: document.getElementById('r-relationship').value,
        identityNo: document.getElementById('r-identityNo').value,
        phone: document.getElementById('r-phone').value,
        occupation: document.getElementById('r-occupation').value,
      };
      try {
        await ResidentsAPI.create(data);
        showToast('Resident added!','success');
        await this.render(container,user,showToast);
      } catch(err) { showToast(err.message,'error'); btn.textContent='Add Resident'; btn.disabled=false; }
    };
  }
}
