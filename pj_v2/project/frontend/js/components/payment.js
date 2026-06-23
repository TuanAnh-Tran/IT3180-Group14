import { FeesAPI, PaymentsAPI } from '../api.js';

export function bridgeFM(fm) { /* no-op in API mode */ }

export class PaymentView {
  static async render(container, user, showToast) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--text-muted);">Loading payment data...</div>`;

    const isAdmin = user.role === 'admin';
    let assigned=[], receipts=[], stats=null, periods=[], households=[];

    try {
      [periods, households] = await Promise.all([FeesAPI.getPeriods(), FeesAPI.getHouseholds()]);
      const activePeriod = periods.find(p=>p.status==='ACTIVE');
      if (activePeriod) assigned = await FeesAPI.getAssigned({ periodId: activePeriod.id });
      [receipts] = await Promise.all([
        PaymentsAPI.getReceipts(),
      ]);
      if (isAdmin) stats = await PaymentsAPI.getStats().catch(()=>null);
    } catch(e) { showToast(e.message,'error'); }

    const activePeriod = periods.find(p=>p.status==='ACTIVE');
    const unpaidAFs = assigned.filter(a=>a.status==='UNPAID');
    const paidAFs   = assigned.filter(a=>a.status==='PAID');

    const fmt = n => Number(n||0).toLocaleString('vi-VN') + ' ₫';

    container.innerHTML = `
      ${isAdmin && stats ? `
      <div class="metrics-grid" style="margin-bottom:20px;">
        <div class="metric-card"><div class="metric-info"><h3>Total Receipts</h3><div class="metric-value">${stats.totalReceipts}</div></div></div>
        <div class="metric-card success"><div class="metric-info"><h3>Total Collected</h3><div class="metric-value" style="font-size:18px;">${fmt(stats.totalCollected)}</div></div></div>
        <div class="metric-card warning"><div class="metric-info"><h3>Unpaid (Active)</h3><div class="metric-value">${unpaidAFs.length}</div></div></div>
        <div class="metric-card accent"><div class="metric-info"><h3>Paid (Active)</h3><div class="metric-value">${paidAFs.length}</div></div></div>
      </div>` : ''}

      <!-- Unpaid fees -->
      ${activePeriod ? `
      <div class="chart-card" style="margin-bottom:20px;">
        <div class="card-header">
          <div><h2 class="card-title">Unpaid Fees — ${activePeriod.name}</h2><p class="card-title-muted">${unpaidAFs.length} item(s) pending</p></div>
        </div>
        <div style="overflow-x:auto;margin-top:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-glass);">
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Household</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Fee</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Calc</th>
              <th style="padding:10px;text-align:right;color:var(--text-muted);">Amount</th>
              ${isAdmin?'<th style="padding:10px;text-align:left;color:var(--text-muted);">Action</th>':''}
            </tr></thead>
            <tbody>
              ${unpaidAFs.map(af=>`
                <tr style="border-bottom:1px solid var(--border-glass);" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:10px;font-weight:600;color:var(--color-accent);">${af.householdId}</td>
                  <td style="padding:10px;">${af.fee?.name||af.feeId}</td>
                  <td style="padding:10px;">${af.fee?.calcMethod||''}</td>
                  <td style="padding:10px;text-align:right;font-weight:600;color:var(--color-warning);">${fmt(af.amount)}</td>
                  ${isAdmin?`<td style="padding:10px;"><button class="btn btn-sm" style="background:var(--color-success-light);color:var(--color-success);border:1px solid var(--color-success);" onclick="window.__payNow('${af.id}',${af.amount})">Pay</button></td>`:''}
                </tr>`).join('')}
              ${unpaidAFs.length===0?`<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--color-success);">✅ All fees paid!</td></tr>`:''}
            </tbody>
          </table>
        </div>
      </div>` : '<div class="chart-card" style="margin-bottom:20px;text-align:center;padding:24px;color:var(--text-muted);">No active collection period.</div>'}

      <!-- Receipts -->
      <div class="chart-card">
        <div class="card-header"><div><h2 class="card-title">Payment Receipts</h2><p class="card-title-muted">${receipts.length} receipt(s)</p></div></div>
        <div style="overflow-x:auto;margin-top:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-glass);">
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Receipt ID</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Household</th>
              <th style="padding:10px;text-align:right;color:var(--text-muted);">Amount Paid</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">Paid At</th>
              <th style="padding:10px;text-align:left;color:var(--text-muted);">By</th>
              ${isAdmin?'<th style="padding:10px;text-align:left;color:var(--text-muted);">Undo</th>':''}
            </tr></thead>
            <tbody>
              ${receipts.map(r=>`
                <tr style="border-bottom:1px solid var(--border-glass);" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:10px;font-weight:600;color:var(--color-primary);font-size:11px;">${r.id}</td>
                  <td style="padding:10px;">${r.householdId}</td>
                  <td style="padding:10px;text-align:right;color:var(--color-success);font-weight:600;">${fmt(r.amountPaid)}</td>
                  <td style="padding:10px;">${new Date(r.paidAt).toLocaleString('en-US')}</td>
                  <td style="padding:10px;">@${r.createdBy}</td>
                  ${isAdmin?`<td style="padding:10px;"><button class="btn btn-sm" style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);" onclick="window.__undoPay('${r.assignedFeeId}')">Undo</button></td>`:''}
                </tr>`).join('')}
              ${receipts.length===0?'<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-muted);">No receipts yet.</td></tr>':''}
            </tbody>
          </table>
        </div>
      </div>`;

    if (isAdmin) {
      window.__payNow = async (afId, amount) => {
        const note = prompt('Payment note (optional):') || '';
        try {
          await PaymentsAPI.pay(afId, amount, note);
          showToast('Payment recorded!','success');
          await this.render(container, user, showToast);
        } catch(e) { showToast(e.message,'error'); }
      };
      window.__undoPay = async (afId) => {
        if (!confirm('Undo this payment? The receipt will be deleted.')) return;
        try {
          await PaymentsAPI.undo(afId);
          showToast('Payment undone.','success');
          await this.render(container, user, showToast);
        } catch(e) { showToast(e.message,'error'); }
      };
    }
  }
}
