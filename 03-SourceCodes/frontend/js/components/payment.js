/**
 * PAYMENT MODULE (payment.js)
 * Tích hợp kết nối API Spring Boot với cơ chế tự động Fallback về LocalStorage.
 */

import { API } from '../api.js';

/* ─────────────────────────────────────────────
   1. RECEIPT STORE — lưu biên lai vào localStorage (Chế độ Fallback)
   ───────────────────────────────────────────── */
const RECEIPT_KEY = 'smartfee_receipts_v2_en';

function receiptLoad() {
  try { return JSON.parse(localStorage.getItem(RECEIPT_KEY)) || []; } catch { return []; }
}
function receiptSave(arr) { localStorage.setItem(RECEIPT_KEY, JSON.stringify(arr)); }

function uid() {
  return 'REC_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase();
}

/* ─────────────────────────────────────────────
   2. PAYMENT ENGINE — port từ PaymentService.java
   ───────────────────────────────────────────── */
export const PaymentEngine = {

  recordPayment(assignedFeeId, amountPaid, note, createdBy, FM) {
    const db = FM._getDB();
    const af = db.assignedFees.find(a => a.id === assignedFeeId);
    if (!af) throw new Error('Fee not found: ' + assignedFeeId);
    if (af.status === 'PAID') throw new Error('This fee has already been fully paid.');

    const fee = db.fees.find(f => f.id === af.feeId);
    const hh  = db.households.find(h => h.id === af.householdId);
    const amountRequired = this.calcAmount(fee, hh, af.quantity);

    let payment = Number(amountPaid);
    if (isNaN(payment) || payment <= 0) {
      const current = af.amountPaidAccumulated || 0;
      payment = amountRequired - current;
    }

    const currentAccumulated = af.amountPaidAccumulated || 0;
    const newAccumulated = currentAccumulated + payment;
    af.amountPaidAccumulated = newAccumulated;

    if (newAccumulated >= amountRequired) {
      af.status = 'PAID';
    } else {
      af.status = 'PARTIAL';
    }
    af.paidAt = new Date().toISOString();
    FM._saveDB(db);

    // Tạo biên lai
    const receipt = {
      id: uid(),
      assignedFeeId,
      householdId: af.householdId,
      periodId: af.periodId,
      feeId: af.feeId,
      amountRequired,
      amountPaid: payment,
      amountPaidAccumulated: newAccumulated,
      paidAt: new Date().toISOString(),
      note: note || '',
      createdBy: createdBy || 'system',
      createdAt: new Date().toISOString(),
      receiptStatus: 'ACTIVE'
    };
    const receipts = receiptLoad();
    receipts.unshift(receipt);
    receiptSave(receipts);
    return receipt;
  },

  undoPayment(assignedFeeId, FM) {
    const db = FM._getDB();
    const af = db.assignedFees.find(a => a.id === assignedFeeId);
    if (af) { 
      af.status = 'UNPAID'; 
      af.amountPaidAccumulated = 0;
      af.paidAt = null; 
      FM._saveDB(db); 
    }
    const receipts = receiptLoad().filter(r => r.assignedFeeId !== assignedFeeId);
    receiptSave(receipts);
  },

  calcAmount(fee, hh, quantity) {
    if (!fee) return 0;
    if (fee.id === 'FEE_DEBT') {
      return fee.price * (quantity || 0);
    }
    switch (fee.calcMethod) {
      case 'FIXED':          return fee.price;
      case 'PER_MEMBER':     return fee.price * (hh?.membersCount || 1);
      case 'PER_AREA':       return fee.price * (hh?.area || 1);
      case 'PER_MOTORCYCLE': return fee.price * (hh?.motorcycleCount || 0);
      case 'PER_CAR':        return fee.price * (hh?.carCount || 0);
      case 'CONSUMPTION':    return fee.price * (quantity || 0);
      default:               return fee.price * (quantity || 1);
    }
  },

  getAllReceipts() { return receiptLoad(); },

  getReceiptsByHousehold(householdId) {
    return receiptLoad().filter(r => r.householdId === householdId);
  },

  getReceiptsByDateRange(from, to) {
    return receiptLoad().filter(r => {
      const t = new Date(r.paidAt).getTime();
      return t >= from.getTime() && t <= to.getTime();
    });
  },

  getReceiptById(id) {
    return receiptLoad().find(r => r.id === id) || null;
  },

  getOverview(FM) {
    const db = FM._getDB();
    const afs = db.assignedFees;
    const paid   = afs.filter(a => a.status === 'PAID');
    const unpaid = afs.filter(a => a.status === 'UNPAID');

    let totalCollected = 0, totalPending = 0;
    afs.forEach(af => {
      const fee = db.fees.find(f => f.id === af.feeId);
      const hh  = db.households.find(h => h.id === af.householdId);
      const amt = this.calcAmount(fee, hh, af.quantity);
      if (af.status === 'PAID') totalCollected += amt;
      else totalPending += amt;
    });

    const completionRate = afs.length ? Math.round(paid.length / afs.length * 10000) / 100 : 0;

    return {
      totalCollected,
      totalPending,
      totalHouseholds: db.households.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      completionRate,
    };
  },

  getByPeriod(periodId, FM) {
    const db = FM._getDB();
    const afs = db.assignedFees.filter(a => a.periodId === periodId);
    const paid   = afs.filter(a => a.status === 'PAID');
    const unpaid = afs.filter(a => a.status === 'UNPAID');

    let totalCollected = 0, totalPending = 0;
    afs.forEach(af => {
      const fee = db.fees.find(f => f.id === af.feeId);
      const hh  = db.households.find(h => h.id === af.householdId);
      const amt = this.calcAmount(fee, hh, af.quantity);
      if (af.status === 'PAID') totalCollected += amt;
      else totalPending += amt;
    });

    const completionRate = afs.length ? Math.round(paid.length / afs.length * 10000) / 100 : 0;
    const period = db.periods.find(p => p.id === periodId);

    return {
      periodId,
      periodName: period?.name || '',
      totalAssigned: afs.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      totalCollected,
      totalPending,
      completionRate,
    };
  },

  getMonthlyRevenue(year, FM) {
    const db = FM._getDB();
    const monthly = {};
    for (let m = 1; m <= 12; m++) monthly['Month ' + m] = 0;

    db.assignedFees.filter(a => a.status === 'PAID' && a.paidAt).forEach(af => {
      const d = new Date(af.paidAt);
      if (d.getFullYear() !== year) return;
      const key = 'Month ' + (d.getMonth() + 1);
      const fee = db.fees.find(f => f.id === af.feeId);
      const hh  = db.households.find(h => h.id === af.householdId);
      monthly[key] += this.calcAmount(fee, hh, af.quantity);
    });
    return monthly;
  },

  getRevenueByFeeType(FM) {
    const db = FM._getDB();
    const byType = { COMPULSORY: 0, VOLUNTARY: 0 };
    db.assignedFees.filter(a => a.status === 'PAID').forEach(af => {
      const fee = db.fees.find(f => f.id === af.feeId);
      const hh  = db.households.find(h => h.id === af.householdId);
      if (!fee) return;
      byType[fee.type] = (byType[fee.type] || 0) + this.calcAmount(fee, hh, af.quantity);
    });
    return byType;
  },

  getTopDebtors(FM, limit = 5) {
    const db = FM._getDB();
    const debtMap = {};
    db.assignedFees.filter(a => a.status === 'UNPAID').forEach(af => {
      const fee = db.fees.find(f => f.id === af.feeId);
      const hh  = db.households.find(h => h.id === af.householdId);
      if (!hh) return;
      if (!debtMap[hh.id]) debtMap[hh.id] = { householdId: hh.id, ownerName: hh.ownerName, totalDebt: 0, unpaidCount: 0 };
      debtMap[hh.id].totalDebt += this.calcAmount(fee, hh, af.quantity);
      debtMap[hh.id].unpaidCount++;
    });
    return Object.values(debtMap).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, limit);
  },
};

/* ─────────────────────────────────────────────
   3. FM BRIDGE
   ───────────────────────────────────────────── */
export function bridgeFM(FM) {
  if (!FM._getDB) {
    FM._getDB  = () => { try { return JSON.parse(localStorage.getItem('smartfee_v2_en')) || {}; } catch { return {}; } };
    FM._saveDB = (db) => localStorage.setItem('smartfee_v2_en', JSON.stringify(db));
  }
}

/* ─────────────────────────────────────────────
   4. PAYMENT VIEW — Full UI
   ───────────────────────────────────────────── */
export class PaymentView {
  static async render(container, currentUser, showToast) {
    const FM = window.__FM__;
    if (!FM) { container.innerHTML = '<p style="padding:20px;color:var(--text-muted);">Loading...</p>'; return; }
    bridgeFM(FM);

    let isBackend = await API.checkHealth();

    container.innerHTML = `
      <style>
        .pv-wrap { font-family: var(--font-family); }
        .pv-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .pv-tab  { border:none; background:var(--bg-tertiary); color:var(--text-secondary); padding:10px 18px; border-radius:999px; cursor:pointer; font-weight:600; font-size:13px; font-family:var(--font-family); transition:var(--transition-fast); }
        .pv-tab.active { background:var(--color-primary); color:#fff; }
        .pv-panel { display:none; } .pv-panel.active { display:block; }
        .pv-card  { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-lg); padding:20px; margin-bottom:20px; }
        .pv-card h3 { font-size:15px; font-weight:700; color:var(--text-primary); margin:0 0 14px; }
        .pv-grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
        .pv-stat  { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-lg); padding:18px; }
        .pv-stat .lbl { font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:8px; }
        .pv-stat .val { font-size:19px; font-weight:800; color:var(--text-primary); }
        .pv-stat .val.g{color:var(--color-success);} .pv-stat .val.y{color:var(--color-warning);} .pv-stat .val.b{color:var(--color-primary);}
        .pv-tbl-wrap { overflow-x:auto; }
        .pv-tbl { width:100%; border-collapse:collapse; min-width:600px; }
        .pv-tbl th { background:var(--bg-tertiary); color:var(--text-muted); font-size:11px; font-weight:700; text-transform:uppercase; padding:10px 14px; text-align:left; }
        .pv-tbl td { padding:10px 14px; border-bottom:1px solid var(--border-glass); color:var(--text-primary); font-size:13px; vertical-align:middle; }
        .pv-tbl tr:hover td { background:var(--bg-tertiary); }
        .pv-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; }
        .pv-badge.green{background:var(--color-success-light);color:var(--color-success);}
        .pv-badge.red  {background:var(--color-danger-light);color:var(--color-danger);}
        .pv-badge.blue {background:var(--color-primary-light);color:var(--color-primary);}
        .pv-badge.gray {background:var(--bg-tertiary);color:var(--text-muted);}
        .pv-btn { border:none; border-radius:var(--border-radius-sm); cursor:pointer; font-weight:600; font-family:var(--font-family); font-size:12px; padding:7px 12px; transition:var(--transition-fast); }
        .pv-btn.pri{background:var(--color-primary);color:#fff;} .pv-btn.pri:hover{background:var(--color-primary-hover);}
        .pv-btn.suc{background:var(--color-success-light);color:var(--color-success);} .pv-btn.suc:hover{background:var(--color-success);color:#fff;}
        .pv-btn.dan{background:var(--color-danger-light);color:var(--color-danger);} .pv-btn.dan:hover{background:var(--color-danger);color:#fff;}
        .pv-btn.sec{background:var(--bg-tertiary);color:var(--text-secondary);} .pv-btn.sec:hover{color:var(--text-primary);}
        .pv-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
        .pv-filter { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
        .pv-sel,.pv-inp { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:var(--border-radius-sm); color:var(--text-primary); font-size:13px; padding:8px 12px; outline:none; font-family:var(--font-family); }
        .pv-sel:focus,.pv-inp:focus { border-color:var(--color-primary); }
        .pv-chart-wrap { position:relative; width:100%; height:220px; }
        .pv-chart-wrap canvas { width:100%!important; height:220px!important; }
        .pv-pie-wrap { display:flex; gap:24px; align-items:center; flex-wrap:wrap; }
        .pv-pie-canvas { width:160px!important; height:160px!important; flex-shrink:0; }
        .pv-pie-legend { display:flex; flex-direction:column; gap:8px; }
        .pv-pie-leg-item { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary); }
        .pv-pie-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
        .pv-rank { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:var(--color-primary-light); color:var(--color-primary); font-size:11px; font-weight:800; }
        .pv-ov { display:none; position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(5px); z-index:600; align-items:center; justify-content:center; }
        .pv-ov.active { display:flex; }
        .pv-modal { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-lg); width:100%; max-width:480px; box-shadow:var(--shadow-lg); overflow:hidden; }
        .pv-mh { display:flex; align-items:flex-start; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--border-glass); }
        .pv-mh h3 { font-size:16px; font-weight:700; color:var(--text-primary); margin:0; }
        .pv-mh p  { font-size:12px; color:var(--text-muted); margin:4px 0 0; }
        .pv-mb { padding:22px; }
        .pv-xbtn { background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:22px; line-height:1; padding:4px 8px; border-radius:6px; }
        .pv-xbtn:hover { color:var(--color-danger); background:var(--color-danger-light); }
        .pv-form { display:flex; flex-direction:column; gap:12px; }
        .pv-field { display:flex; flex-direction:column; gap:4px; }
        .pv-field label { font-size:12px; font-weight:600; color:var(--text-secondary); }
        .pv-field input,.pv-field textarea { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:var(--border-radius-sm); color:var(--text-primary); font-size:13px; padding:9px 12px; outline:none; font-family:var(--font-family); width:100%; }
        .pv-field input:focus,.pv-field textarea:focus { border-color:var(--color-primary); }
        .pv-receipt-box { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:var(--border-radius-md); padding:14px; margin-top:8px; }
        .pv-receipt-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; }
        .pv-receipt-row span:first-child { color:var(--text-secondary); }
        .pv-receipt-row strong { color:var(--text-primary); }
        @media(max-width:900px){ .pv-grid4{grid-template-columns:repeat(2,1fr)!important;} }
        @media(max-width:560px){ .pv-grid4{grid-template-columns:1fr!important;} }
      </style>

      <div class="pv-wrap">
        <div class="chart-card" style="margin-bottom:20px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="card-title" style="margin-bottom:4px;">Payment & Statistics</h2>
            <p class="card-title-muted" id="pv-backend-status">Connecting to backend...</p>
          </div>
        </div>

        <div class="pv-tabs">
          <button class="pv-tab active" data-pv="pv-pay">Payment</button>
          <button class="pv-tab" data-pv="pv-receipts">Receipt History</button>
          ${currentUser.role !== 'user' ? `<button class="pv-tab" data-pv="pv-stats">Statistics</button>` : ''}
        </div>

        <!-- ── TAB: THANH TOÁN ── -->
        <div class="pv-panel active" id="pv-pay">
          <div class="pv-card">
            <div class="pv-row">
              <h3 style="margin:0;">List of Unpaid Fees</h3>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <select class="pv-sel" id="pv-pay-period">
                  <option value="">All Periods</option>
                </select>
                <select class="pv-sel" id="pv-pay-hh">
                  <option value="">All Households</option>
                </select>
                <button class="pv-btn pri" id="pv-pay-export-debt-btn" style="display:none;background:#f59e0b;color:#fff;align-items:center;gap:6px;">
                  Export Debt List
                </button>
              </div>
            </div>
            <div class="pv-tbl-wrap">
              <table class="pv-tbl">
                <thead><tr>
                  <th>Household</th><th>Collection Period</th><th>Fee Name</th>
                  <th>Amount</th><th>Status</th>
                  <th style="text-align:right;">Actions</th>
                </tr></thead>
                <tbody id="pv-pay-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── TAB: LỊCH SỬ BIÊN LAI ── -->
        <div class="pv-panel" id="pv-receipts">
          <div class="pv-card">
            <div class="pv-filter">
              <select class="pv-sel" id="pv-rec-hh"><option value="">All Households</option></select>
              <input type="date" class="pv-inp" id="pv-rec-from" title="From date">
              <input type="date" class="pv-inp" id="pv-rec-to" title="To date">
              <button class="pv-btn pri" id="pv-rec-filter-btn">Filter</button>
              <button class="pv-btn sec" id="pv-rec-clear-btn">Clear Filter</button>
              <button class="pv-btn pri" id="pv-rec-export-btn" style="display:none;background:#10b981;color:#fff;align-items:center;gap:6px;">
                Export Excel
              </button>
            </div>
            <div class="pv-tbl-wrap">
              <table class="pv-tbl">
                <thead><tr>
                  <th>Receipt ID</th><th>Household</th><th>Fee Name</th>
                  <th>Amount Paid</th><th>Paid Date</th><th>Note</th><th>Collector</th>
                  ${currentUser.role !== 'user' ? `<th>Status</th><th style="text-align:right;">Actions</th>` : ''}
                </tr></thead>
                <tbody id="pv-rec-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── TAB: THỐNG KÊ ── -->
        ${currentUser.role !== 'user' ? `
        <div class="pv-panel" id="pv-stats">
          <div class="pv-grid4" id="pv-stats-grid"></div>

          <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px;margin-bottom:20px;">
            <div class="pv-card" style="margin-bottom:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                <h3 style="margin:0;">Monthly Revenue</h3>
                <select class="pv-sel" id="pv-year-sel"></select>
              </div>
              <div class="pv-chart-wrap"><canvas id="pv-bar-chart"></canvas></div>
            </div>
            <div class="pv-card" style="margin-bottom:0;">
              <h3>By Fee Type</h3>
              <div class="pv-pie-wrap">
                <canvas class="pv-pie-canvas" id="pv-pie-chart"></canvas>
                <div class="pv-pie-legend" id="pv-pie-legend"></div>
              </div>
            </div>
          </div>

          <div class="pv-card">
            <h3>Top Unpaid Households</h3>
            <div class="pv-tbl-wrap">
              <table class="pv-tbl">
                <thead><tr><th>#</th><th>Household</th><th>Unpaid Fees Count</th><th>Total Debt</th></tr></thead>
                <tbody id="pv-debt-tbody"></tbody>
              </table>
            </div>
          </div>

          <div class="pv-card">
            <h3>Voluntary Contributions Per Household</h3>
            <div class="pv-tbl-wrap">
              <table class="pv-tbl">
                <thead><tr><th>Household</th><th>Voluntary Fee Name</th><th>Amount Contained</th><th>Date Paid</th></tr></thead>
                <tbody id="pv-contrib-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- MODAL: Payment Form -->
      <div class="pv-ov" id="pv-ov-pay">
        <div class="pv-modal">
          <div class="pv-mh">
            <div><h3>Record Payment</h3><p id="pv-pay-m-sub"></p></div>
            <button class="pv-xbtn" data-pvclose="pv-ov-pay">&times;</button>
          </div>
          <div class="pv-mb">
            <div id="pv-pay-qr-container" style="text-align:center; margin-bottom:16px; display:none;">
              <h4 style="font-size:12px; margin-bottom:8px; color:var(--text-secondary);">Scan QR to pay automatically</h4>
              <img id="pv-pay-qr-img" src="" alt="VietQR" style="max-width:200px; border:2px solid var(--border-glass); border-radius:12px;" />
            </div>
            <div class="pv-receipt-box" id="pv-pay-m-info" style="margin-bottom:16px;"></div>
            <div class="pv-form">
              <input type="hidden" id="pv-pay-m-afid">
              <div class="pv-field">
                <label>Amount Paid (VND)</label>
                <input type="number" id="pv-pay-m-amount" min="0" placeholder="Automatically calculated if left blank">
              </div>
              <div class="pv-field">
                <label>Payer Representative (Người nộp tiền)</label>
                <input type="text" id="pv-pay-m-payer" placeholder="e.g. John Doe">
              </div>
              <div class="pv-field">
                <label>Note (Optional)</label>
                <textarea id="pv-pay-m-note" rows="2" placeholder="e.g. Bank Transfer, Cash..."></textarea>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button class="pv-btn sec" data-pvclose="pv-ov-pay">Cancel</button>
                <button class="pv-btn suc" id="pv-pay-m-confirm">Confirm Payment</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const q   = s => container.querySelector(s);
    const vnd = n => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0);
    const fmt = iso => iso ? new Date(iso).toLocaleString('vi-VN') : '—';
    const open  = id => container.querySelector('#'+id).classList.add('active');
    const close = id => container.querySelector('#'+id).classList.remove('active');

    const statusEl = q('#pv-backend-status');
    if (statusEl) {
      if (isBackend) {
        statusEl.innerHTML = `<span style="color:#10b981;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
          <span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;animation:pulse 1.5s infinite;"></span>
          Connected to Java Backend (REST API + MySQL)
        </span>`;
        if (currentUser.role !== 'user') {
          q('#pv-rec-export-btn').style.display = 'inline-flex';
          q('#pv-pay-export-debt-btn').style.display = 'inline-flex';
        }
      } else {
        statusEl.innerHTML = `<span style="color:var(--text-muted);font-weight:500;">⚪ Fallback Mode (Running mock LocalStorage)</span>`;
      }
    }

    container.querySelectorAll('[data-pvclose]').forEach(b => b.addEventListener('click', () => close(b.dataset.pvclose)));

    container.querySelectorAll('.pv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.pv-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.pv-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        container.querySelector('#'+tab.dataset.pv).classList.add('active');
        renderCurrent();
      });
    });

    q('#pv-rec-export-btn').addEventListener('click', async () => {
      const hhFilter = q('#pv-rec-hh').value;
      try {
        await API.exportExcel('period-receipts', hhFilter || 'PER001');
        showToast('Export successful', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    q('#pv-pay-export-debt-btn').addEventListener('click', async () => {
      const periodFilter = q('#pv-pay-period').value;
      try {
        await API.exportExcel('period-debt', periodFilter || 'PER001');
        showToast('Export successful', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    function populateSelects() {
      const db = FM._getDB();
      [q('#pv-pay-period')].forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = '<option value="">All Periods</option>';
        db.periods.forEach(p => {
          const o = document.createElement('option');
          o.value = p.id; o.textContent = p.name; sel.appendChild(o);
        });
        sel.value = cur;
      });

      const isResident = currentUser.role === 'user';
      [q('#pv-pay-hh'), q('#pv-rec-hh')].forEach(sel => {
        const cur = sel.value;
        if (isResident) {
          sel.innerHTML = '';
          const matchedHh = db.households.find(h => h.id === currentUser.room);
          if (matchedHh) {
            const o = document.createElement('option');
            o.value = matchedHh.id; o.textContent = `${matchedHh.id} — ${matchedHh.ownerName}`; sel.appendChild(o);
            sel.value = matchedHh.id;
          } else {
            const o = document.createElement('option');
            o.value = currentUser.room || ''; o.textContent = `${currentUser.room || 'Unassigned'} — ${currentUser.fullname}`; sel.appendChild(o);
            sel.value = currentUser.room || '';
          }
          sel.disabled = true;
        } else {
          sel.innerHTML = '<option value="">All Households</option>';
          db.households.forEach(h => {
            const o = document.createElement('option');
            o.value = h.id; o.textContent = `${h.id} — ${h.ownerName}`; sel.appendChild(o);
          });
          sel.value = cur;
          sel.disabled = false;
        }
      });

      const ySel = q('#pv-year-sel');
      if (ySel) {
        const thisYear = new Date().getFullYear();
        if (!ySel.options.length) {
          for (let y = thisYear; y >= thisYear-4; y--) {
            const o = document.createElement('option'); o.value = y; o.textContent = 'Year '+y;
            ySel.appendChild(o);
          }
        }
      }
    }

    async function renderUnpaid() {
      const db = FM._getDB();
      const periodFilter = q('#pv-pay-period').value;
      const hhFilter = q('#pv-pay-hh').value;
      
      let afs = [];
      if (isBackend) {
        try {
          const apiData = await API.getUnpaidFees(periodFilter, hhFilter);
          const dataList = apiData.content || apiData || [];
          afs = dataList.map(d => ({
            id: d.id,
            householdId: d.householdId,
            periodId: d.periodId,
            feeId: d.feeId,
            feeName: d.feeName,
            unitPrice: d.unitPrice,
            periodName: d.periodName,
            ownerName: d.ownerName,
            quantity: d.quantity,
            status: d.status,
            paidAt: d.paidAt,
            amountRequired: d.amountRequired,
            amountPaidAccumulated: d.amountPaidAccumulated
          }));
        } catch (e) {
          console.error("Fallback to local unpaid:", e);
          isBackend = false;
        }
      }

      if (!isBackend) {
        afs = db.assignedFees.filter(a => a.status === 'UNPAID' || a.status === 'PARTIAL');
        if (periodFilter) afs = afs.filter(a => a.periodId === periodFilter);
        if (hhFilter)     afs = afs.filter(a => a.householdId === hhFilter);
      }

      const isResident = currentUser.role === 'user';
      if (isResident) {
        afs = afs.filter(a => a.householdId === currentUser.room);
      }

      q('#pv-pay-tbody').innerHTML = afs.map(af => {
        const fee = isBackend ? { name: af.feeName, price: af.unitPrice } : db.fees.find(f => f.id === af.feeId);
        const hh  = isBackend ? { id: af.householdId, ownerName: af.ownerName } : db.households.find(h => h.id === af.householdId);
        const per = isBackend ? { name: af.periodName } : db.periods.find(p => p.id === af.periodId);
        const amt = isBackend ? af.amountRequired : PaymentEngine.calcAmount(fee, hh, af.quantity);
        const paidAcc = af.amountPaidAccumulated || 0;
        const remaining = amt - paidAcc;
        const badge = af.status === 'PARTIAL'
          ? `<span class="pv-badge" style="background:#f59e0b;color:#fff;">Partial (${vnd(paidAcc)})</span>`
          : `<span class="pv-badge red">Unpaid</span>`;
        return `<tr>
          <td><strong>${hh?.id||'?'}</strong><br><small style="color:var(--text-muted);">${hh?.ownerName||'?'}</small></td>
          <td style="font-size:12px;">${per?.name||af.periodId}</td>
          <td>${fee?.name||'?'}</td>
          <td><strong>${vnd(amt)}</strong></td>
          <td>${badge}</td>
          <td style="text-align:right;">
            <button class="pv-btn suc pv-do-pay" data-id="${af.id}" data-amt="${remaining}" data-fee="${fee?.name||''}" data-hh="${hh?.id||''}-${hh?.ownerName||''}">Pay</button>
          </td>
        </tr>`;
      }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No unpaid fees found.</td></tr>`;

      q('#pv-pay-tbody').querySelectorAll('.pv-do-pay').forEach(b => {
        b.addEventListener('click', () => openPayModal(b.dataset.id, b.dataset.amt, b.dataset.fee, b.dataset.hh));
      });
    }

    async function openPayModal(assignedFeeId, remaining, feeName, hhInfo) {
      q('#pv-pay-m-afid').value = assignedFeeId;
      q('#pv-pay-m-amount').value = remaining;
      q('#pv-pay-m-payer').value = '';
      q('#pv-pay-m-note').value = '';
      q('#pv-pay-m-sub').textContent = `${feeName} — Household ${hhInfo}`;
      q('#pv-pay-m-info').innerHTML = `
        <div class="pv-receipt-row"><span>Remaining amount:</span><strong>${vnd(remaining)}</strong></div>
      `;
      
      const qrContainer = q('#pv-pay-qr-container');
      const qrImg = q('#pv-pay-qr-img');
      if (qrContainer && qrImg) {
        if (isBackend) {
          try {
            const qrUrl = await API.getQrUrl(assignedFeeId);
            qrImg.src = qrUrl;
            qrContainer.style.display = 'block';
          } catch (e) {
            qrContainer.style.display = 'none';
          }
        } else {
          const mockUrl = `https://img.vietqr.io/image/MB-123456789-compact2.png?amount=${remaining}&addInfo=THANH%20TOAN%20PHI%20${assignedFeeId}`;
          qrImg.src = mockUrl;
          qrContainer.style.display = 'block';
        }
      }
      open('pv-ov-pay');
    }

    q('#pv-pay-m-confirm').addEventListener('click', async () => {
      const afid = q('#pv-pay-m-afid').value;
      const amt  = q('#pv-pay-m-amount').value;
      const note = q('#pv-pay-m-note').value;
      const payer = q('#pv-pay-m-payer').value;

      try {
        if (isBackend) {
          const params = {
            assignedFeeId: afid,
            amountPaid: amt ? Number(amt) : null,
            note: note,
            payerName: payer,
            idempotencyKey: 'IDEM_' + afid + '_' + Date.now()
          };
          await API.fetchJson('/payments', {
            method: 'POST',
            body: JSON.stringify(params)
          });
        } else {
          PaymentEngine.recordPayment(afid, amt, note, currentUser.fullname, FM);
        }
        showToast('Payment recorded successfully', 'success');
        close('pv-ov-pay');
        renderCurrent();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    async function renderReceipts() {
      const db = FM._getDB();
      const hhFilter   = q('#pv-rec-hh').value;
      const fromVal    = q('#pv-rec-from').value;
      const toVal      = q('#pv-rec-to').value;

      let receipts = [];
      if (isBackend) {
        try {
          const apiData = await API.getReceiptHistory(hhFilter, fromVal, toVal);
          receipts = apiData.content || [];
        } catch (e) {
          console.error("Fallback to local receipts:", e);
          isBackend = false;
        }
      }

      if (!isBackend) {
        receipts = PaymentEngine.getAllReceipts();
        if (hhFilter) receipts = receipts.filter(r => r.householdId === hhFilter);
        if (fromVal)  receipts = receipts.filter(r => new Date(r.paidAt) >= new Date(fromVal));
        if (toVal)    receipts = receipts.filter(r => new Date(r.paidAt) <= new Date(toVal + 'T23:59:59'));
      }

      if (currentUser.role === 'user') {
        receipts = receipts.filter(r => r.householdId === currentUser.room);
      }

      q('#pv-rec-tbody').innerHTML = receipts.map(r => {
        const rId = isBackend ? r.receiptId : r.id;
        const hhName = isBackend ? r.ownerName : (db.households.find(h => h.id === r.householdId)?.ownerName || '?');
        const feeName = isBackend ? r.feeName : (db.fees.find(f => f.id === r.feeId)?.name || r.feeId);
        const statusStr = r.receiptStatus || 'ACTIVE';
        const badge = statusStr === 'CANCELLED' 
          ? '<span class="pv-badge red">Cancelled</span>'
          : '<span class="pv-badge green">Active</span>';

        return `<tr>
          <td><code style="font-size:11px;color:var(--color-primary);">${rId}</code></td>
          <td><strong>${r.householdId}</strong><br><small style="color:var(--text-muted);">${hhName}</small></td>
          <td style="font-size:12px;">${feeName}</td>
          <td><strong style="color:var(--color-success);">${vnd(r.amountPaid)}</strong></td>
          <td style="font-size:12px;">${fmt(r.paidAt)}</td>
          <td style="font-size:12px;color:var(--text-muted);">${r.note||'—'}</td>
          <td>${r.createdBy||'—'} ${r.payerName ? `<br><small style="color:var(--text-muted);">Payer: ${r.payerName}</small>` : ''}</td>
          ${currentUser.role !== 'user' ? `
            <td>${badge}</td>
            <td style="text-align:right;">
              ${statusStr === 'ACTIVE' ? `<button class="pv-btn dan pv-cancel-receipt" data-id="${rId}">Cancel</button>` : '—'}
            </td>
          ` : ''}
        </tr>`;
      }).join('') || `<tr><td colspan="${currentUser.role !== 'user' ? 9 : 7}" style="text-align:center;color:var(--text-muted);padding:20px;">No receipts found.</td></tr>`;

      if (currentUser.role !== 'user') {
        q('#pv-rec-tbody').querySelectorAll('.pv-cancel-receipt').forEach(b => {
          b.addEventListener('click', async () => {
            if (!confirm(`Are you sure you want to cancel receipt ${b.dataset.id}?`)) return;
            try {
              if (isBackend) {
                await API.cancelReceipt(b.dataset.id);
              } else {
                const rec = PaymentEngine.getReceiptById(b.dataset.id);
                if (rec) {
                  PaymentEngine.undoPayment(rec.assignedFeeId, FM);
                }
              }
              showToast('Receipt cancelled successfully', 'success');
              renderCurrent();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      }
    }

    async function renderStats() {
      let overviewData = null;
      let monthlyRevenue = {};
      let revenueByFeeType = {};
      let debtors = [];
      let contributions = [];
      const year = parseInt(q('#pv-year-sel').value) || new Date().getFullYear();

      if (isBackend) {
        try {
          overviewData = await API.getOverview();
          
          const mData = await API.getMonthlyRevenue(year);
          monthlyRevenue = mData.monthlyRevenue || {};
          
          const tData = await API.getRevenueByFeeType();
          revenueByFeeType = tData.revenueByFeeType || {};

          const unpaidData = await API.getUnpaidFees();
          const unpaidList = unpaidData.content || [];
          let totalPending = 0;
          const debtMap = {};

          unpaidList.forEach(af => {
            totalPending += af.amountRequired;
            if (!debtMap[af.householdId]) {
              debtMap[af.householdId] = { householdId: af.householdId, ownerName: af.ownerName, totalDebt: 0, unpaidCount: 0 };
            }
            debtMap[af.householdId].totalDebt += af.amountRequired;
            debtMap[af.householdId].unpaidCount++;
          });

          overviewData.totalPending = totalPending;
          debtors = Object.values(debtMap).sort((a,b) => b.totalDebt - a.totalDebt).slice(0, 10);
          
          contributions = await API.getContributions();
        } catch (e) {
          console.error("Fallback to local stats:", e);
          isBackend = false;
        }
      }

      if (!isBackend) {
        overviewData = PaymentEngine.getOverview(FM);
        monthlyRevenue = PaymentEngine.getMonthlyRevenue(year, FM);
        revenueByFeeType = PaymentEngine.getRevenueByFeeType(FM);
        debtors = PaymentEngine.getTopDebtors(FM, 10);

        const db = FM._getDB();
        contributions = db.assignedFees.filter(af => af.status === 'PAID').map(af => {
          const fee = db.fees.find(f => f.id === af.feeId);
          if (fee && fee.type === 'VOLUNTARY') {
            const hh = db.households.find(h => h.id === af.householdId);
            return {
              householdId: af.householdId,
              ownerName: hh?.ownerName || '?',
              feeName: fee.name,
              amountPaid: af.amountPaidAccumulated || (fee.price * af.quantity),
              paidAt: af.paidAt
            };
          }
          return null;
        }).filter(x => x !== null);
      }

      q('#pv-stats-grid').innerHTML = `
        <div class="pv-stat"><div class="lbl">Total Collected</div><div class="val g">${vnd(overviewData.totalCollected)}</div></div>
        <div class="pv-stat"><div class="lbl">Remaining Debt</div><div class="val y">${vnd(overviewData.totalPending)}</div></div>
        <div class="pv-stat"><div class="lbl">Completion Rate</div><div class="val b">${overviewData.completionRate}%</div></div>
        <div class="pv-stat"><div class="lbl">Total Households</div><div class="val">${overviewData.totalHouseholds}</div></div>
      `;

      drawBarChart(monthlyRevenue);
      drawPieChart(revenueByFeeType);

      q('#pv-debt-tbody').innerHTML = debtors.map((d,i) => `
        <tr>
          <td><span class="pv-rank">${i+1}</span></td>
          <td><strong>${d.householdId}</strong> — ${d.ownerName}</td>
          <td><span class="pv-badge red">${d.unpaidCount} fees</span></td>
          <td><strong style="color:var(--color-warning);">${vnd(d.totalDebt)}</strong></td>
        </tr>
      `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--color-success);padding:20px;">🎉 All households paid!</td></tr>`;

      q('#pv-contrib-tbody').innerHTML = contributions.map(c => `
        <tr>
          <td><strong>${c.householdId}</strong> — ${c.ownerName}</td>
          <td>${c.feeName}</td>
          <td><strong style="color:var(--color-success);">${vnd(c.amountPaid)}</strong></td>
          <td style="font-size:12px;">${fmt(c.paidAt)}</td>
        </tr>
      `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">No voluntary contributions recorded yet.</td></tr>`;
    }

    function drawBarChart(monthly) {
      const vals = Object.values(monthly);
      const labels = vals.map((_, i) => 'M'+(i+1));
      const max = Math.max(...vals, 1);

      const canvas = q('#pv-bar-chart');
      if (!canvas) return;
      canvas.width = canvas.parentElement.clientWidth || 400;
      canvas.height = 220;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const W = canvas.width, H = canvas.height;
      const pad = { t:20, b:30, l:10, r:10 };
      const chartW = W - pad.l - pad.r;
      const chartH = H - pad.t - pad.b;
      const barW = (chartW / 12) * 0.6;
      const gap  = (chartW / 12) * 0.4;

      ctx.strokeStyle = 'rgba(128,128,128,0.2)';
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H-pad.b); ctx.lineTo(W-pad.r, H-pad.b); ctx.stroke();

      const gradient = ctx.createLinearGradient(0, pad.t, 0, H-pad.b);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#818cf8');

      vals.forEach((v, i) => {
        const x = pad.l + i * (barW + gap) + gap/2;
        const barH = (v / max) * chartH;
        const y = H - pad.b - barH;

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, barH, 4) : ctx.rect(x, y, barW, barH);
        ctx.fill();

        ctx.fillStyle = 'var(--text-secondary)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + barW/2, H - 12);
      });
    }

    function drawPieChart(byType) {
      const canvas = q('#pv-pie-chart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,160,160);

      const data = Object.values(byType);
      const keys = Object.keys(byType);
      const total = data.reduce((a,b)=>a+b, 0);

      const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b'];
      let lastAngle = -0.5 * Math.PI;

      data.forEach((v, i) => {
        if (v === 0) return;
        const angle = (v / (total || 1)) * 2 * Math.PI;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(80, 80);
        ctx.arc(80, 80, 70, lastAngle, lastAngle + angle);
        ctx.closePath();
        ctx.fill();
        lastAngle += angle;
      });

      const leg = q('#pv-pie-legend');
      leg.innerHTML = keys.map((k,i) => `
        <div class="pv-pie-leg-item">
          <span class="pv-pie-dot" style="background:${colors[i%colors.length]};"></span>
          <span>${k}: <strong>${vnd(data[i])}</strong></span>
        </div>
      `).join('');
    }

    function renderCurrent() {
      populateSelects();
      const active = q('.pv-tab.active').dataset.pv;
      if (active === 'pv-pay')      renderUnpaid();
      if (active === 'pv-receipts') renderReceipts();
      if (active === 'pv-stats')    renderStats();
    }

    q('#pv-pay-period').addEventListener('change', renderUnpaid);
    q('#pv-pay-hh').addEventListener('change', renderUnpaid);
    q('#pv-rec-hh').addEventListener('change', renderReceipts);
    q('#pv-rec-filter-btn').addEventListener('click', renderReceipts);
    q('#pv-rec-clear-btn').addEventListener('click', () => {
      q('#pv-rec-hh').value = '';
      q('#pv-rec-from').value = '';
      q('#pv-rec-to').value = '';
      renderReceipts();
    });

    const ySel = q('#pv-year-sel');
    if (ySel) {
      ySel.addEventListener('change', renderStats);
    }

    renderCurrent();
  }
}
