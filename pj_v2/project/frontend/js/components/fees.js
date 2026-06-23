import { FeesAPI, PaymentsAPI } from '../api.js';

// FM bridge object — legacy compatibility với payment.js
export const FM = {
  _getDB() {
    // Not used in API mode; returns empty structure
    return { fees: [], households: [], periods: [], assignedFees: [] };
  },
  _saveDB() {}
};

export class FeeManagerView {
  static async render(container, showToast) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--text-muted);">Loading fee manager...</div>`;

    let fees=[], households=[], periods=[], assigned=[];
    try {
      [fees, households, periods] = await Promise.all([
        FeesAPI.getFees(), FeesAPI.getHouseholds(), FeesAPI.getPeriods()
      ]);
      const activePeriod = periods.find(p=>p.status==='ACTIVE');
      if (activePeriod) assigned = await FeesAPI.getAssigned({ periodId: activePeriod.id });
    } catch(e) { showToast(e.message,'error'); }

    const activePeriod = periods.find(p=>p.status==='ACTIVE');

    container.innerHTML = `
      <!-- KPI Row -->
      <div class="metrics-grid" style="margin-bottom:20px;">
        <div class="metric-card">
          <div class="metric-info"><h3>Fee Types</h3><div class="metric-value">${fees.length}</div></div>
        </div>
        <div class="metric-card accent">
          <div class="metric-info"><h3>Households</h3><div class="metric-value">${households.length}</div></div>
        </div>
        <div class="metric-card success">
          <div class="metric-info"><h3>Active Period</h3><div class="metric-value" style="font-size:16px;">${activePeriod?activePeriod.name:'None'}</div></div>
        </div>
        <div class="metric-card warning">
          <div class="metric-info"><h3>Assigned Fees</h3><div class="metric-value">${assigned.length}</div>
          <div class="metric-desc">${assigned.filter(a=>a.status==='PAID').length} paid / ${assigned.filter(a=>a.status==='UNPAID').length} unpaid</div></div>
        </div>
      </div>

      <!-- Fee Types Table -->
      <div class="chart-card" style="margin-bottom:20px;">
        <div class="card-header">
          <div><h2 class="card-title">Fee Types</h2></div>
          <button class="btn btn-primary btn-sm" id="btn-add-fee">+ Add Fee</button>
        </div>
        <div style="overflow-x:auto;margin-top:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-glass);">
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Name</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Type</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Calc Method</th>
              <th style="padding:10px;text-align:right;color:var(--text-muted);">Unit Price (VNĐ)</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Actions</th>
            </tr></thead>
            <tbody>
              ${fees.map(f=>`
                <tr style="border-bottom:1px solid var(--border-glass);" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:10px;font-weight:500;">${f.name}</td>
                  <td style="padding:10px;"><span class="role-badge ${f.type==='COMPULSORY'?'role-admin':'role-user'}">${f.type}</span></td>
                  <td style="padding:10px;">${f.calcMethod}</td>
                  <td style="padding:10px;text-align:right;">${Number(f.price).toLocaleString('vi-VN')}</td>
                  <td style="padding:10px;display:flex;gap:6px;">
                    <button class="btn btn-sm" style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);" onclick="window.__feeDelete('${f.id}')">Delete</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Households Table -->
      <div class="chart-card" style="margin-bottom:20px;">
        <div class="card-header">
          <div><h2 class="card-title">Households</h2></div>
          <button class="btn btn-primary btn-sm" id="btn-add-hh">+ Add Household</button>
        </div>
        <div style="overflow-x:auto;margin-top:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-glass);">
              <th style="padding:10px;text-align:left;color:var(--text-muted);">ID</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Owner</th>
              <th style="padding:10px;text-align:center;color:var(--text-muted);">Members</th>
              <th style="padding:10px;text-align:center;color:var(--text-muted);">Area (m²)</th>
              <th style="padding:10px;text-align:center;color:var(--text-muted);">Motorbikes</th>
              <th style="padding:10px;text-align:center;color:var(--text-muted);">Cars</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Actions</th>
            </tr></thead>
            <tbody>
              ${households.map(h=>`
                <tr style="border-bottom:1px solid var(--border-glass);" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:10px;font-weight:600;color:var(--color-primary);">${h.id}</td>
                  <td style="padding:10px;">${h.ownerName}</td>
                  <td style="padding:10px;text-align:center;">${h.membersCount}</td>
                  <td style="padding:10px;text-align:center;">${h.area}</td>
                  <td style="padding:10px;text-align:center;">${h.motorcycleCount}</td>
                  <td style="padding:10px;text-align:center;">${h.carCount}</td>
                  <td style="padding:10px;display:flex;gap:6px;">
                    <button class="btn btn-sm" style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);" onclick="window.__hhDelete('${h.id}')">Delete</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Collection Period -->
      <div class="chart-card">
        <div class="card-header">
          <div><h2 class="card-title">Collection Periods</h2></div>
          <button class="btn btn-primary btn-sm" id="btn-add-period">+ New Period</button>
        </div>
        <div style="margin-top:12px;">
          ${periods.map(p=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid var(--border-glass);border-radius:var(--border-radius-sm);margin-bottom:8px;">
              <div>
                <div style="font-weight:600;">${p.name}</div>
                <div style="font-size:12px;color:var(--text-muted);">Created: ${new Date(p.createdAt).toLocaleDateString('en-US')}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span class="role-badge ${p.status==='ACTIVE'?'role-admin':'role-user'}">${p.status}</span>
                ${p.status==='ACTIVE'?`<button class="btn btn-sm" style="background:var(--color-warning-light);color:var(--color-warning);border:1px solid var(--color-warning);" onclick="window.__periodClose('${p.id}')">Close</button>`:''}
              </div>
            </div>`).join('')}
          ${periods.length===0?'<div style="text-align:center;color:var(--text-muted);padding:20px;">No periods created.</div>':''}
        </div>
      </div>`;

    // Actions
    document.getElementById('btn-add-fee').onclick = () => this._addFeeModal(showToast, () => this.render(container, showToast));
    document.getElementById('btn-add-hh').onclick  = () => this._addHhModal(showToast, () => this.render(container, showToast));
    document.getElementById('btn-add-period').onclick = () => this._addPeriodModal(fees, showToast, () => this.render(container, showToast));

    window.__feeDelete = async (id) => {
      if (!confirm('Delete this fee type?')) return;
      try { await FeesAPI.deleteFee(id); showToast('Fee deleted.','success'); await this.render(container,showToast); }
      catch(e) { showToast(e.message,'error'); }
    };
    window.__hhDelete = async (id) => {
      if (!confirm(`Delete household ${id}?`)) return;
      try { await FeesAPI.deleteHousehold(id); showToast('Household deleted.','success'); await this.render(container,showToast); }
      catch(e) { showToast(e.message,'error'); }
    };
    window.__periodClose = async (id) => {
      if (!confirm('Close this period? All fees will be locked.')) return;
      try { await FeesAPI.updatePeriodStatus(id,'CLOSED'); showToast('Period closed.','success'); await this.render(container,showToast); }
      catch(e) { showToast(e.message,'error'); }
    };
  }

  static _addFeeModal(showToast, refresh) {
    const d = document.createElement('div');
    d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:center;justify-content:center;';
    d.innerHTML=`<div style="background:var(--bg-secondary);border:1px solid var(--border-glass);border-radius:var(--border-radius-lg);padding:28px;width:100%;max-width:460px;">
      <h2 style="margin:0 0 16px;font-size:16px;">Add Fee Type</h2>
      <div class="form-group"><label class="form-label">Name *</label><input type="text" class="form-control" id="m-name" required></div>
      <div class="form-group"><label class="form-label">Type</label><select class="form-control" id="m-type"><option value="COMPULSORY">COMPULSORY</option><option value="VOLUNTARY">VOLUNTARY</option></select></div>
      <div class="form-group"><label class="form-label">Calc Method</label><select class="form-control" id="m-calc"><option value="FIXED">FIXED</option><option value="PER_MEMBER">PER_MEMBER</option><option value="PER_AREA">PER_AREA</option><option value="CONSUMPTION">CONSUMPTION</option></select></div>
      <div class="form-group"><label class="form-label">Unit Price (VNĐ) *</label><input type="number" class="form-control" id="m-price" min="0" required></div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" id="m-ok" style="flex:1;">Create</button>
        <button class="btn" id="m-cancel" style="flex:1;background:var(--bg-tertiary);color:var(--text-secondary);">Cancel</button>
      </div></div>`;
    document.body.appendChild(d);
    document.getElementById('m-cancel').onclick=()=>d.remove();
    document.getElementById('m-ok').onclick=async()=>{
      try {
        await FeesAPI.createFee({ name:document.getElementById('m-name').value, type:document.getElementById('m-type').value, calcMethod:document.getElementById('m-calc').value, price:document.getElementById('m-price').value });
        showToast('Fee created!','success'); d.remove(); refresh();
      } catch(e){ showToast(e.message,'error'); }
    };
  }

  static _addHhModal(showToast, refresh) {
    const d = document.createElement('div');
    d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:center;justify-content:center;';
    d.innerHTML=`<div style="background:var(--bg-secondary);border:1px solid var(--border-glass);border-radius:var(--border-radius-lg);padding:28px;width:100%;max-width:480px;">
      <h2 style="margin:0 0 16px;font-size:16px;">Add Household</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">ID (e.g. P401) *</label><input type="text" class="form-control" id="hm-id" required></div>
        <div class="form-group"><label class="form-label">Owner Name *</label><input type="text" class="form-control" id="hm-owner" required></div>
        <div class="form-group"><label class="form-label">Members</label><input type="number" class="form-control" id="hm-members" value="1" min="1"></div>
        <div class="form-group"><label class="form-label">Area (m²)</label><input type="number" class="form-control" id="hm-area" value="60"></div>
        <div class="form-group"><label class="form-label">Motorbikes</label><input type="number" class="form-control" id="hm-moto" value="0" min="0"></div>
        <div class="form-group"><label class="form-label">Cars</label><input type="number" class="form-control" id="hm-car" value="0" min="0"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" id="hm-ok" style="flex:1;">Create</button>
        <button class="btn" id="hm-cancel" style="flex:1;background:var(--bg-tertiary);color:var(--text-secondary);">Cancel</button>
      </div></div>`;
    document.body.appendChild(d);
    document.getElementById('hm-cancel').onclick=()=>d.remove();
    document.getElementById('hm-ok').onclick=async()=>{
      try {
        await FeesAPI.createHousehold({id:document.getElementById('hm-id').value,ownerName:document.getElementById('hm-owner').value,membersCount:document.getElementById('hm-members').value,area:document.getElementById('hm-area').value,motorcycleCount:document.getElementById('hm-moto').value,carCount:document.getElementById('hm-car').value});
        showToast('Household created!','success'); d.remove(); refresh();
      } catch(e){ showToast(e.message,'error'); }
    };
  }

  static _addPeriodModal(fees, showToast, refresh) {
    const d = document.createElement('div');
    d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:center;justify-content:center;';
    d.innerHTML=`<div style="background:var(--bg-secondary);border:1px solid var(--border-glass);border-radius:var(--border-radius-lg);padding:28px;width:100%;max-width:460px;">
      <h2 style="margin:0 0 16px;font-size:16px;">Create Collection Period</h2>
      <div class="form-group"><label class="form-label">Period Name *</label><input type="text" class="form-control" id="pm-name" placeholder="e.g. Đợt thu phí tháng 06/2026" required></div>
      <p style="font-size:13px;color:var(--text-muted);margin:8px 0 4px;">All COMPULSORY fees will be auto-assigned to all households.</p>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" id="pm-ok" style="flex:1;">Create Period</button>
        <button class="btn" id="pm-cancel" style="flex:1;background:var(--bg-tertiary);color:var(--text-secondary);">Cancel</button>
      </div></div>`;
    document.body.appendChild(d);
    document.getElementById('pm-cancel').onclick=()=>d.remove();
    document.getElementById('pm-ok').onclick=async()=>{
      try {
        await FeesAPI.createPeriod({name:document.getElementById('pm-name').value});
        showToast('Period created! Fees auto-assigned.','success'); d.remove(); refresh();
      } catch(e){ showToast(e.message,'error'); }
    };
  }
}
