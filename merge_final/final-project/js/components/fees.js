/**
 * FEEMANAGER COMPONENT (fees.js)
 * Quản lý thu phí hộ gia đình — toàn bộ logic từ Java backend
 * được port sang JavaScript thuần, lưu trữ qua localStorage.
 *
 * Logic nghiệp vụ port nguyên từ FeeManager.java:
 *  - CRUD khoản thu (Fee), đợt thu (CollectionPeriod), hộ dân (Household)
 *  - Tự động gán phí bắt buộc khi tạo đợt/thêm hộ mới
 *  - Tính hóa đơn chi tiết theo công thức (FIXED / PER_MEMBER / PER_AREA / CONSUMPTION)
 *  - Thanh toán / hoàn tác, thống kê tiến độ đợt thu
 */

const FM_KEY = 'smartfee_v1';

/* ===== localStorage helpers ===== */
function fmLoad() {
  try { return JSON.parse(localStorage.getItem(FM_KEY)) || null; } catch { return null; }
}
function fmSave(db) { localStorage.setItem(FM_KEY, JSON.stringify(db)); }

function fmGetDB() {
  let db = fmLoad();
  if (!db) { db = fmSeed(); fmSave(db); }
  return db;
}

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

/* ===== Seed data (port từ initSampleData() Java) ===== */
function fmSeed() {
  const fees = [
    { id: uid('FEE'), name: 'Apartment Service Fee',  type: 'COMPULSORY', calcMethod: 'PER_AREA',    price: 7000  },
    { id: uid('FEE'), name: 'Motorbike Parking Fee',   type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 70000 },
    { id: uid('FEE'), name: 'Residential Water Fee',  type: 'COMPULSORY', calcMethod: 'CONSUMPTION', price: 15000 },
    { id: uid('FEE'), name: 'Flood & Storm Donation Fund', type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 50000 },
    { id: uid('FEE'), name: 'Neighborhood Security Fee', type: 'COMPULSORY', calcMethod: 'PER_MEMBER',  price: 10000 },
    { id: uid('FEE'), name: 'Car Parking Fee',        type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 1200000 },
    { id: uid('FEE'), name: 'Cleaning Fee',            type: 'COMPULSORY', calcMethod: 'PER_MEMBER',  price: 72000 },
    { id: uid('FEE'), name: '27 July Memorial Donation', type: 'VOLUNTARY', calcMethod: 'DONATION', price: 1 },
    { id: uid('FEE'), name: "Children's Day Donation",               type: 'VOLUNTARY', calcMethod: 'DONATION', price: 1 },
    { id: uid('FEE'), name: 'Donation for the Poor',                   type: 'VOLUNTARY', calcMethod: 'DONATION', price: 1 }
  ];

  const [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10] = fees;
  const allFeeIds = fees.map(f => f.id);

  const households = [
    { id: 'P101', ownerName: 'Nguyen Van Hung',   membersCount: 4, area: 75.0,  motorcycleCount: 2, carCount: 1 },
    { id: 'P102', ownerName: 'Tran Thi Tuyet',    membersCount: 2, area: 60.0,  motorcycleCount: 1, carCount: 0 },
    { id: 'P201', ownerName: 'Pham Minh Tuan',    membersCount: 5, area: 110.0, motorcycleCount: 3, carCount: 1 },
    { id: 'P202', ownerName: 'Le Hoang Nam',      membersCount: 3, area: 85.0,  motorcycleCount: 2, carCount: 1 },
    { id: 'P301', ownerName: 'Hoang Duc Long',    membersCount: 1, area: 45.0,  motorcycleCount: 0, carCount: 0 },
  ];

  const periodId = uid('PER');
  const periods = [{ id: periodId, name: 'Fee Collection May 2026', feeIds: allFeeIds, status: 'ACTIVE', createdAt: new Date().toISOString() }];

  // Auto-assign logic (port từ autoAssignCompulsoryFees + xe gửi)
  let assignedFees = [];
  function autoAssign(hh, pId, fIds) {
    for (const feeId of fIds) {
      const fee = fees.find(f => f.id === feeId);
      if (!fee) continue;
      const already = assignedFees.some(a => a.householdId === hh.id && a.periodId === pId && a.feeId === feeId);
      if (already) continue;
      let shouldAssign = false, qty = 1;
      if (fee.type === 'COMPULSORY') {
        shouldAssign = true;
        if (fee.calcMethod === 'PER_MEMBER') qty = hh.membersCount;
        else if (fee.calcMethod === 'PER_AREA') qty = hh.area;
        else if (fee.calcMethod === 'CONSUMPTION') qty = 0;
      } else if (fee.name === 'Motorbike Parking Fee' && hh.motorcycleCount > 0) {
        shouldAssign = true; qty = hh.motorcycleCount;
      } else if (fee.name === 'Car Parking Fee' && hh.carCount > 0) {
        shouldAssign = true; qty = hh.carCount;
      }
      if (shouldAssign) assignedFees.push({ id: uid('ASF'), householdId: hh.id, periodId: pId, feeId, quantity: qty, status: 'UNPAID', paidAt: null });
    }
  }

  households.forEach(hh => autoAssign(hh, periodId, allFeeIds));

  // Cập nhật chỉ số nước và gán tự nguyện (port từ initSampleData)
  function setQty(hhId, feeId, qty) {
    const af = assignedFees.find(a => a.householdId === hhId && a.periodId === periodId && a.feeId === feeId);
    if (af) af.quantity = qty;
    else assignedFees.push({ id: uid('ASF'), householdId: hhId, periodId, feeId, quantity: qty, status: 'UNPAID', paidAt: null });
  }

  setQty('P101', f3.id, 18); setQty('P101', f4.id, 1); setQty('P101', f8.id, 150000);
  setQty('P102', f3.id, 8);
  setQty('P201', f3.id, 25); setQty('P201', f4.id, 2); setQty('P201', f9.id, 200000);
  setQty('P202', f3.id, 12);
  setQty('P301', f3.id, 5);

  // P102 đã thanh toán phí dịch vụ + phí an ninh
  assignedFees.forEach(af => {
    if (af.householdId === 'P102' && (af.feeId === f1.id || af.feeId === f5.id)) {
      af.status = 'PAID'; af.paidAt = new Date().toISOString();
    }
  });

  return { fees, periods, households, assignedFees };
}

/* ===== Business logic (port từ FeeManager.java) ===== */
const FM = {
  // ----- FEES -----
  getFees() { return fmGetDB().fees; },

  createFee(name, type, calcMethod, price) {
    const db = fmGetDB();
    const fee = { id: uid('FEE'), name, type, calcMethod, price };
    db.fees.push(fee); fmSave(db); return fee;
  },

  updateFee(id, name, type, calcMethod, price) {
    const db = fmGetDB();
    const f = db.fees.find(x => x.id === id);
    if (!f) return null;
    Object.assign(f, { name, type, calcMethod, price });
    fmSave(db); return f;
  },

  deleteFee(id) {
    const db = fmGetDB();
    const idx = db.fees.findIndex(f => f.id === id);
    if (idx === -1) return false;
    db.fees.splice(idx, 1);
    db.periods.forEach(p => { p.feeIds = p.feeIds.filter(fid => fid !== id); });
    db.assignedFees = db.assignedFees.filter(af => af.feeId !== id);
    fmSave(db); return true;
  },

  // ----- PERIODS -----
  getPeriods() { return fmGetDB().periods; },

  createPeriod(name, feeIds) {
    const db = fmGetDB();
    const period = { id: uid('PER'), name, feeIds, status: 'ACTIVE', createdAt: new Date().toISOString() };
    db.periods.push(period);
    // Auto-assign cho tất cả hộ dân hiện có
    this._autoAssignAll(db, period.id, feeIds);
    fmSave(db); return period;
  },

  closePeriod(id) {
    const db = fmGetDB();
    const p = db.periods.find(x => x.id === id);
    if (p) p.status = 'CLOSED';
    fmSave(db);
  },

  // ----- HOUSEHOLDS -----
  getHouseholds() { return fmGetDB().households; },

  createHousehold(id, ownerName, membersCount, area, motorcycleCount, carCount) {
    const db = fmGetDB();
    if (db.households.find(h => h.id.toUpperCase() === id.toUpperCase()))
      throw new Error(`Household code "${id}" already exists!`);
    const hh = { id: id.toUpperCase(), ownerName, membersCount, area, motorcycleCount, carCount };
    db.households.push(hh);
    // Auto-assign cho các đợt thu đang ACTIVE
    db.periods.filter(p => p.status === 'ACTIVE').forEach(p => {
      this._autoAssignSingle(db, hh, p.id, p.feeIds);
    });
    fmSave(db); return hh;
  },

  // ----- ASSIGN -----
  assignFee(householdId, periodId, feeId, quantity) {
    const db = fmGetDB();
    const existing = db.assignedFees.find(a => a.householdId === householdId && a.periodId === periodId && a.feeId === feeId);
    if (existing) { existing.quantity = quantity; fmSave(db); return existing; }
    const af = { id: uid('ASF'), householdId, periodId, feeId, quantity, status: 'UNPAID', paidAt: null };
    db.assignedFees.push(af); fmSave(db); return af;
  },

  unassignFee(householdId, periodId, feeId) {
    const db = fmGetDB();
    db.assignedFees = db.assignedFees.filter(a => !(a.householdId === householdId && a.periodId === periodId && a.feeId === feeId));
    fmSave(db);
  },

  payFee(assignedFeeId) {
    const db = fmGetDB();
    const af = db.assignedFees.find(a => a.id === assignedFeeId);
    if (af) { af.status = 'PAID'; af.paidAt = new Date().toISOString(); }
    fmSave(db);
  },

  unpayFee(assignedFeeId) {
    const db = fmGetDB();
    const af = db.assignedFees.find(a => a.id === assignedFeeId);
    if (af) { af.status = 'UNPAID'; af.paidAt = null; }
    fmSave(db);
  },

  // ----- CALCULATIONS (port từ calculateHouseholdBill + calculatePeriodStats) -----
  calcBill(householdId, periodId) {
    const db = fmGetDB();
    const hh = db.households.find(h => h.id === householdId);
    if (!hh) return { householdId, ownerName: '?', membersCount: 0, area: 0, items: [], totalAmount: 0, totalPaid: 0, totalUnpaid: 0 };

    const afs = db.assignedFees.filter(a => a.householdId === householdId && a.periodId === periodId);
    let totalAmount = 0, totalPaid = 0, totalUnpaid = 0;
    const items = [];

    for (const af of afs) {
      const fee = db.fees.find(f => f.id === af.feeId);
      if (!fee) continue;
      const amount = fee.price * af.quantity;
      if (af.status === 'PAID') totalPaid += amount; else totalUnpaid += amount;
      totalAmount += amount;
      items.push({ assignedFeeId: af.id, feeId: fee.id, feeName: fee.name, feeType: fee.type, calcMethod: fee.calcMethod, price: fee.price, quantity: af.quantity, amount, status: af.status, paidAt: af.paidAt });
    }
    return { householdId: hh.id, ownerName: hh.ownerName, membersCount: hh.membersCount, area: hh.area, items, totalAmount, totalPaid, totalUnpaid };
  },

  calcStats(periodId) {
    const db = fmGetDB();
    const period = db.periods.find(p => p.id === periodId);
    if (!period) return { periodId, totalExpected: 0, totalCollected: 0, totalRemaining: 0, completionRate: 0, totalAssignments: 0, paidAssignments: 0 };

    let totalExpected = 0, totalCollected = 0, totalAssignments = 0, paidAssignments = 0;
    db.assignedFees.filter(a => a.periodId === periodId).forEach(af => {
      const fee = db.fees.find(f => f.id === af.feeId);
      if (!fee) return;
      const amount = fee.price * af.quantity;
      totalExpected += amount; totalAssignments++;
      if (af.status === 'PAID') { totalCollected += amount; paidAssignments++; }
    });
    const completionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    return { periodId: period.id, totalExpected, totalCollected, totalRemaining: totalExpected - totalCollected, completionRate, totalAssignments, paidAssignments };
  },

  getHouseholdsWithBill(periodId) {
    const db = fmGetDB();
    return db.households.map(hh => ({ ...hh, calculatedBill: this.calcBill(hh.id, periodId) }));
  },

  resetSeed() { localStorage.removeItem(FM_KEY); fmGetDB(); },

  // ----- INTERNAL AUTO-ASSIGN -----
  _autoAssignAll(db, periodId, feeIds) {
    db.households.forEach(hh => this._autoAssignSingle(db, hh, periodId, feeIds));
  },

  _autoAssignSingle(db, hh, periodId, feeIds) {
    for (const feeId of feeIds) {
      const fee = db.fees.find(f => f.id === feeId);
      if (!fee) continue;
      const already = db.assignedFees.some(a => a.householdId === hh.id && a.periodId === periodId && a.feeId === feeId);
      if (already) continue;
      let shouldAssign = false, qty = 1;
      if (fee.type === 'COMPULSORY') {
        shouldAssign = true;
        if (fee.calcMethod === 'PER_MEMBER') qty = hh.membersCount;
        else if (fee.calcMethod === 'PER_AREA') qty = hh.area;
        else if (fee.calcMethod === 'CONSUMPTION') qty = 0;
      } else if (fee.name === 'Motorbike Parking Fee' && hh.motorcycleCount > 0) {
        shouldAssign = true; qty = hh.motorcycleCount;
      } else if (fee.name === 'Car Parking Fee' && hh.carCount > 0) {
        shouldAssign = true; qty = hh.carCount;
      }
      if (shouldAssign) db.assignedFees.push({ id: uid('ASF'), householdId: hh.id, periodId, feeId, quantity: qty, status: 'UNPAID', paidAt: null });
    }
  },
};

/* ===================================================================
   RENDER — Full UI (không cần server)
   =================================================================== */
export class FeeManagerView {
  static render(container, currentUser, showToast) {
    const isResident = currentUser && currentUser.role === 'user';
    container.innerHTML = `
      <style>
        .sf-wrap { font-family: var(--font-family); }
        .sf-period-bar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
        .sf-period-bar label { font-size:13px; color:var(--text-secondary); font-weight:600; }
        .sf-sel { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:var(--border-radius-md); color:var(--text-primary); font-size:14px; padding:9px 14px; outline:none; cursor:pointer; font-family:var(--font-family); }
        .sf-sel:focus { border-color:var(--color-primary); }
        .sf-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .sf-tab { border:none; background:var(--bg-tertiary); color:var(--text-secondary); padding:10px 18px; border-radius:999px; cursor:pointer; font-weight:600; font-size:13px; font-family:var(--font-family); transition:var(--transition-fast); }
        .sf-tab.active { background:var(--color-primary); color:#fff; }
        .sf-panel { display:none; } .sf-panel.active { display:block; }
        .sf-card { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-lg); padding:20px; margin-bottom:20px; }
        .sf-card h3 { font-size:16px; font-weight:700; color:var(--text-primary); margin:0 0 16px; }
        .sf-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
        .sf-stat { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:var(--border-radius-lg); padding:18px; }
        .sf-stat .lbl { font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-bottom:8px; }
        .sf-stat .val { font-size:20px; font-weight:800; color:var(--text-primary); }
        .sf-stat .val.green{color:var(--color-success);} .sf-stat .val.yellow{color:var(--color-warning);} .sf-stat .val.blue{color:var(--color-primary);}
        .sf-prog-track{background:var(--bg-tertiary);border-radius:999px;height:8px;margin-top:8px;}
        .sf-prog-fill{background:linear-gradient(90deg,var(--color-primary),var(--color-accent));height:8px;border-radius:999px;transition:width .4s;}
        .sf-tbl-wrap{overflow-x:auto;}
        .sf-tbl{width:100%;border-collapse:collapse;min-width:580px;}
        .sf-tbl th{background:var(--bg-tertiary);color:var(--text-muted);font-size:11px;font-weight:700;text-transform:uppercase;padding:11px 14px;text-align:left;}
        .sf-tbl td{padding:11px 14px;border-bottom:1px solid var(--border-glass);color:var(--text-primary);font-size:13px;vertical-align:middle;}
        .sf-tbl tr:hover td{background:var(--bg-tertiary);}
        .sf-badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;}
        .sf-badge.blue{background:var(--color-primary-light);color:var(--color-primary);}
        .sf-badge.green{background:var(--color-success-light);color:var(--color-success);}
        .sf-badge.red{background:var(--color-danger-light);color:var(--color-danger);}
        .sf-badge.yellow{background:var(--color-warning-light);color:var(--color-warning);}
        .sf-badge.gray{background:var(--bg-tertiary);color:var(--text-muted);}
        .sf-badge.cyan{background:var(--color-accent-light);color:var(--color-accent);}
        .sf-btn{border:none;border-radius:var(--border-radius-sm);cursor:pointer;font-weight:600;font-family:var(--font-family);font-size:12px;padding:7px 12px;transition:var(--transition-fast);}
        .sf-btn.pri{background:var(--color-primary);color:#fff;} .sf-btn.pri:hover{background:var(--color-primary-hover);}
        .sf-btn.sec{background:var(--bg-tertiary);color:var(--text-secondary);} .sf-btn.sec:hover{color:var(--text-primary);}
        .sf-btn.dan{background:var(--color-danger-light);color:var(--color-danger);} .sf-btn.dan:hover{background:var(--color-danger);color:#fff;}
        .sf-btn.suc{background:var(--color-success-light);color:var(--color-success);} .sf-btn.suc:hover{background:var(--color-success);color:#fff;}
        .sf-btn-grp{display:flex;gap:6px;flex-wrap:wrap;}
        .sf-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .sf-2col{display:grid;grid-template-columns:1fr 1.5fr;gap:20px;align-items:start;}
        .sf-form{display:flex;flex-direction:column;gap:12px;}
        .sf-field{display:flex;flex-direction:column;gap:4px;}
        .sf-field label{font-size:12px;font-weight:600;color:var(--text-secondary);}
        .sf-field input,.sf-field select{background:var(--bg-tertiary);border:1px solid var(--border-glass);border-radius:var(--border-radius-sm);color:var(--text-primary);font-size:13px;padding:9px 12px;outline:none;font-family:var(--font-family);width:100%;}
        .sf-field input:focus,.sf-field select:focus{border-color:var(--color-primary);box-shadow:0 0 0 2px var(--color-primary-light);}
        .sf-2field{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .sf-chk-list{display:flex;flex-direction:column;gap:8px;max-height:160px;overflow-y:auto;border:1px solid var(--border-glass);padding:10px;border-radius:var(--border-radius-sm);background:var(--bg-tertiary);}
        .sf-chk-item{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-secondary);}
        .sf-chk-item:hover{color:var(--text-primary);}
        /* overlay */
        .sf-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(5px);z-index:500;align-items:center;justify-content:center;}
        .sf-ov.active{display:flex;}
        .sf-modal{background:var(--bg-secondary);border:1px solid var(--border-glass);border-radius:var(--border-radius-lg);width:100%;box-shadow:var(--shadow-lg);overflow:hidden;}
        .sf-modal-sm{max-width:480px;}
        .sf-modal-lg{max-width:980px;max-height:88vh;display:flex;flex-direction:column;}
        .sf-mh{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border-glass);}
        .sf-mh h3{font-size:16px;font-weight:700;color:var(--text-primary);margin:0;}
        .sf-mh p{font-size:12px;color:var(--text-muted);margin:4px 0 0;}
        .sf-mb{padding:22px;overflow-y:auto;}
        .sf-xbtn{background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:22px;line-height:1;padding:4px 8px;border-radius:6px;}
        .sf-xbtn:hover{color:var(--color-danger);background:var(--color-danger-light);}
        /* bill modal */
        .sf-bill-grid{display:grid;grid-template-columns:1.6fr 1fr;height:100%;}
        .sf-bill-l{padding:20px;border-right:1px solid var(--border-glass);overflow-y:auto;}
        .sf-bill-r{padding:20px;background:var(--bg-primary);overflow-y:auto;}
        .sf-totals{background:var(--bg-secondary);border:1px solid var(--border-glass);border-radius:var(--border-radius-md);padding:16px;margin-bottom:16px;}
        .sf-totals h4{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;}
        .sf-trow{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;}
        .sf-trow span:first-child{color:var(--text-secondary);}
        .sf-trow .amt{font-weight:700;font-size:15px;color:var(--text-primary);}
        .sf-trow.bt{border-top:1px solid var(--border-glass);padding-top:12px;margin-top:4px;}
        .sf-trow.bt .amt{font-size:19px;}
        .sf-qty-inp{width:70px;background:var(--bg-tertiary);border:1px solid var(--border-glass);border-radius:6px;color:var(--text-primary);font-size:13px;padding:5px 8px;outline:none;}
        .sf-qty-inp:focus{border-color:var(--color-primary);}
        @media(max-width:900px){.sf-stats-grid{grid-template-columns:repeat(2,1fr)!important;} .sf-2col{grid-template-columns:1fr!important;} .sf-bill-grid{grid-template-columns:1fr!important;}}
        @media(max-width:560px){.sf-stats-grid{grid-template-columns:1fr!important;}}
      </style>

      <div class="sf-wrap">
        <div class="chart-card" style="margin-bottom:20px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="card-title" style="margin-bottom:4px;">SmartFee — Fee Manager</h2>
            <p class="card-title-muted">Data stored locally in browser (localStorage) • Ported from Java Backend</p>
          </div>
          ${!isResident ? '<button class="btn btn-secondary" id="sf-reset-btn" style="font-size:12px;padding:8px 14px;">Reset Sample Data</button>' : ''}
        </div>

        <div class="sf-period-bar">
          <label>Selected collection period:</label>
          <select class="sf-sel" id="sf-period-sel"></select>
        </div>

        <div class="sf-tabs">
          ${!isResident ? '<button class="sf-tab active" data-sf="sf-db">Dashboard</button>' : ''}
          <button class="sf-tab ${isResident ? 'active' : ''}" data-sf="sf-fees">Fees</button>
          <button class="sf-tab" data-sf="sf-periods">Periods</button>
          <button class="sf-tab" data-sf="sf-hh">Households & Bills</button>
        </div>

        <!-- DASHBOARD -->
        ${!isResident ? `
        <div class="sf-panel active" id="sf-db">
          <div class="sf-stats-grid">
            <div class="sf-stat"><div class="lbl">Total Expected</div><div class="val" id="sf-s-exp">—</div></div>
            <div class="sf-stat"><div class="lbl">Collected</div><div class="val green" id="sf-s-col">—</div></div>
            <div class="sf-stat"><div class="lbl">Remaining Debt</div><div class="val yellow" id="sf-s-rem">—</div></div>
            <div class="sf-stat">
              <div class="lbl">Completion Rate</div>
              <div class="val blue" id="sf-s-rate">—</div>
              <div class="sf-prog-track"><div class="sf-prog-fill" id="sf-prog" style="width:0%"></div></div>
            </div>
          </div>
          <div class="sf-card">
            <h3>Period Details</h3>
            <div style="display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass);font-size:14px;"><span style="color:var(--text-secondary);">Period ID</span><strong id="sf-sm-id">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass);font-size:14px;"><span style="color:var(--text-secondary);">Total Assigned Fees</span><strong id="sf-sm-total">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;"><span style="color:var(--text-secondary);">Paid</span><strong id="sf-sm-paid">—</strong></div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- FEES -->
        <div class="sf-panel ${isResident ? 'active' : ''}" id="sf-fees">
          <div class="sf-card">
            <div class="sf-row"><h3 style="margin:0;">Fee List</h3>${!isResident ? '<button class="sf-btn pri" id="sf-add-fee-btn">+ Create New Fee</button>' : ''}</div>
            <div class="sf-tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>ID</th><th>Fee Name</th><th>Type</th><th>Calc Method</th><th>Price</th>${!isResident ? '<th style="text-align:right;">Actions</th>' : ''}</tr></thead>
                <tbody id="sf-fees-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PERIODS -->
        <div class="sf-panel" id="sf-periods">
          <div class="${!isResident ? 'sf-2col' : ''}">
            ${!isResident ? `
            <div class="sf-card">
              <h3>Create New Period</h3>
              <form class="sf-form" id="sf-form-period">
                <div class="sf-field"><label>Period name</label><input type="text" id="sf-pname" placeholder="e.g. Fee Collection June 2026" required /></div>
                <div class="sf-field"><label>Applied fees</label><div class="sf-chk-list" id="sf-pchk"></div></div>
                <button type="submit" class="sf-btn pri" style="width:100%;">Create & auto-assign compulsory fees</button>
              </form>
            </div>
            ` : ''}
            <div class="sf-card">
              <h3>Existing Periods</h3>
              <div class="sf-tbl-wrap">
                <table class="sf-tbl">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Fees</th>
                      <th>Status</th>
                      ${!isResident ? '<th>Actions</th>' : ''}
                    </tr>
                  </thead>
                  <tbody id="sf-periods-tbody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- HOUSEHOLDS -->
        <div class="sf-panel" id="sf-hh">
          <div class="sf-card">
            <div class="sf-row">
              <span style="font-size:14px;color:var(--text-secondary);">Period: <strong id="sf-hh-pname" style="color:var(--color-primary);">—</strong></span>
              ${!isResident ? '<button class="sf-btn sec" id="sf-add-hh-btn">+ Add Household</button>' : ''}
            </div>
            <div class="sf-tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Household ID</th><th>Owner Name</th><th>Members</th><th>Area (m²)</th><th>Expected</th><th style="color:var(--color-success);">Paid</th><th style="color:var(--color-warning);">Remaining</th><th>Status</th><th>Details</th></tr></thead>
                <tbody id="sf-hh-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: FEE FORM -->
      <div class="sf-ov" id="sf-ov-fee">
        <div class="sf-modal sf-modal-sm">
          <div class="sf-mh"><h3 id="sf-fee-mtitle">Create New Fee</h3><button class="sf-xbtn" data-sfclose="sf-ov-fee">&times;</button></div>
          <div class="sf-mb">
            <form class="sf-form" id="sf-fee-form">
              <input type="hidden" id="sf-fee-eid" />
              <div class="sf-field"><label>Fee name *</label><input type="text" id="sf-fee-name" placeholder="e.g. Cleaning fee..." required /></div>
              <div class="sf-2field">
                <div class="sf-field"><label>Type</label><select id="sf-fee-type"><option value="COMPULSORY">Compulsory</option><option value="VOLUNTARY">Voluntary</option></select></div>
                <div class="sf-field"><label>Calc Method</label><select id="sf-fee-calc"><option value="FIXED">Fixed</option><option value="PER_MEMBER">Per member</option><option value="PER_AREA">Per area</option><option value="CONSUMPTION">Per consumption</option><option value="DONATION">Donation (Voluntary)</option></select></div>
              </div>
              <div class="sf-field"><label>Price (VND) *</label><input type="number" id="sf-fee-price" min="0" placeholder="50000" required /></div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" class="sf-btn sec" data-sfclose="sf-ov-fee">Cancel</button>
                <button type="submit" class="sf-btn pri">Save Fee</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL: HOUSEHOLD FORM -->
      <div class="sf-ov" id="sf-ov-hh">
        <div class="sf-modal sf-modal-sm">
          <div class="sf-mh"><h3>Add New Household</h3><button class="sf-xbtn" data-sfclose="sf-ov-hh">&times;</button></div>
          <div class="sf-mb">
            <form class="sf-form" id="sf-hh-form">
              <div class="sf-field"><label>Household ID *</label><input type="text" id="sf-hh-id" placeholder="e.g. P105" required /></div>
              <div class="sf-field"><label>Owner Name *</label><input type="text" id="sf-hh-owner" placeholder="e.g. Nguyen Van A" required /></div>
              <div class="sf-2field">
                <div class="sf-field"><label>Members count</label><input type="number" id="sf-hh-members" min="1" placeholder="4" required /></div>
                <div class="sf-field"><label>Area (m²)</label><input type="number" id="sf-hh-area" min="1" placeholder="75" required /></div>
              </div>
              <div class="sf-2field">
                <div class="sf-field"><label>Motorbikes</label><input type="number" id="sf-hh-motos" min="0" value="0" /></div>
                <div class="sf-field"><label>Cars</label><input type="number" id="sf-hh-cars" min="0" value="0" /></div>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" class="sf-btn sec" data-sfclose="sf-ov-hh">Cancel</button>
                <button type="submit" class="sf-btn pri">Add Household</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL: BILL DETAIL -->
      <div class="sf-ov" id="sf-ov-bill">
        <div class="sf-modal sf-modal-lg" style="height:85vh;">
          <div class="sf-mh" style="background:linear-gradient(135deg,var(--bg-tertiary),var(--bg-secondary));">
            <div><h3 id="sf-bill-title">Household Bill</h3><p id="sf-bill-sub"></p></div>
            <button class="sf-xbtn" data-sfclose="sf-ov-bill">&times;</button>
          </div>
          <div class="sf-mb" style="padding:0;flex:1;overflow:hidden;">
            <div class="sf-bill-grid" style="height:100%;">
              <div class="sf-bill-l">
                <table class="sf-tbl" style="min-width:500px;">
                  <thead><tr><th>Fee Name</th><th>Formula</th><th>Qty / Price</th><th>Amount</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
                  <tbody id="sf-bill-tbody"></tbody>
                </table>
              </div>
              <div class="sf-bill-r">
                <div class="sf-totals">
                  <h4>Bill Summary</h4>
                  <div class="sf-trow"><span>Total expected</span><span class="amt" id="sf-bill-total">0 VND</span></div>
                  <div class="sf-trow"><span>Total paid</span><span class="amt" style="color:var(--color-success);" id="sf-bill-paid">0 VND</span></div>
                  <div class="sf-trow bt"><span>Remaining debt</span><span class="amt" style="color:var(--color-warning);" id="sf-bill-unpaid">0 VND</span></div>
                </div>
                ${!isResident ? `
                <div class="sf-card" style="margin-bottom:0;">
                  <h3 style="margin-bottom:14px;font-size:14px;">Assign Fee</h3>
                  <form class="sf-form" id="sf-assign-form">
                    <div class="sf-field"><label>Voluntary fee</label><select class="sf-sel" id="sf-assign-sel" style="width:100%;"></select></div>
                    <div class="sf-field"><label>Quantity</label><input type="number" id="sf-assign-qty" min="1" value="1" /></div>
                    <button type="submit" class="sf-btn pri" style="width:100%;">Assign Fee</button>
                  </form>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    /* ===== local state ===== */
    let selectedPeriodId = '';

    /* ===== helpers ===== */
    const q = s => container.querySelector(s);
    const vnd = n => new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(n);
    const open  = id => container.querySelector('#' + id).classList.add('active');
    const close = id => container.querySelector('#' + id).classList.remove('active');
    const closeAll = () => ['sf-ov-fee','sf-ov-hh','sf-ov-bill'].forEach(close);

    // Close buttons
    container.querySelectorAll('[data-sfclose]').forEach(b => b.addEventListener('click', () => close(b.dataset.sfclose)));

    // Tabs
    container.querySelectorAll('.sf-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.sf-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.sf-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        container.querySelector('#' + tab.dataset.sf).classList.add('active');
        renderAll();
      });
    });

    // Reset
    q('#sf-reset-btn').addEventListener('click', () => {
      if (!confirm('Xóa toàn bộ dữ liệu và khôi phục dữ liệu mẫu?')) return;
      FM.resetSeed(); selectedPeriodId = '';
      refreshPeriodSel(); renderAll();
      showToast('Đã reset dữ liệu mẫu', 'info');
    });

    // Period select
    q('#sf-period-sel').addEventListener('change', e => { selectedPeriodId = e.target.value; renderAll(); });

    /* ===== period select ===== */
    function refreshPeriodSel() {
      const periods = FM.getPeriods();
      const sel = q('#sf-period-sel');
      sel.innerHTML = '';
      if (!periods.length) { sel.innerHTML = '<option value="">(No collection periods available)</option>'; selectedPeriodId = ''; return; }
      periods.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = p.name; sel.appendChild(o);
      });
      if (!selectedPeriodId || !periods.find(p => p.id === selectedPeriodId))
        selectedPeriodId = periods[0].id;
      sel.value = selectedPeriodId;
    }

    /* ===== renderAll ===== */
    function renderAll() {
      refreshPeriodSel();
      renderDashboard();
      renderFees();
      renderPeriodCheckboxes();
      renderPeriods();
      renderHouseholds();
    }

    /* ===== dashboard ===== */
    function renderDashboard() {
      if (isResident) return;
      if (!selectedPeriodId) return;
      const s = FM.calcStats(selectedPeriodId);
      q('#sf-s-exp').textContent  = vnd(s.totalExpected);
      q('#sf-s-col').textContent  = vnd(s.totalCollected);
      q('#sf-s-rem').textContent  = vnd(s.totalRemaining);
      q('#sf-s-rate').textContent = s.completionRate + '%';
      q('#sf-prog').style.width   = s.completionRate + '%';
      q('#sf-sm-id').textContent    = s.periodId;
      q('#sf-sm-total').textContent = s.totalAssignments;
      q('#sf-sm-paid').textContent  = s.paidAssignments;
    }

    /* ===== fees tab ===== */
    function renderFees() {
      const calcMap = { FIXED:'Fixed', PER_MEMBER:'Per member', PER_AREA:'Per area', CONSUMPTION:'Per consumption', DONATION:'Donation (Voluntary)' };
      const showActions = !isResident;
      q('#sf-fees-tbody').innerHTML = FM.getFees().map(f => `
        <tr>
          <td><strong>${f.id}</strong></td>
          <td>${f.name}</td>
          <td><span class="sf-badge ${f.type==='COMPULSORY'?'blue':'cyan'}">${f.type==='COMPULSORY'?'Compulsory':'Voluntary'}</span></td>
          <td>${calcMap[f.calcMethod]||f.calcMethod}</td>
          <td><strong>${vnd(f.price)}</strong></td>
          ${showActions ? `
          <td style="text-align:right;"><div class="sf-btn-grp" style="justify-content:flex-end;">
            <button class="sf-btn sec sf-edit-fee" data-id="${f.id}">Edit</button>
            <button class="sf-btn dan sf-del-fee" data-id="${f.id}">Delete</button>
          </div></td>` : ''}
        </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No fees available.</td></tr>`;

      if (showActions) {
        q('#sf-fees-tbody').querySelectorAll('.sf-del-fee').forEach(b => b.addEventListener('click', () => {
          if (!confirm(`Delete fee "${b.dataset.id}"? This will cascade delete related period and assigned fee records.`)) return;
          FM.deleteFee(b.dataset.id); showToast('Fee deleted','info'); renderAll();
        }));
        q('#sf-fees-tbody').querySelectorAll('.sf-edit-fee').forEach(b => b.addEventListener('click', () => openFeeModal(b.dataset.id)));
      }
    }

    /* ===== period checkboxes ===== */
    function renderPeriodCheckboxes() {
      if (isResident) return;
      q('#sf-pchk').innerHTML = FM.getFees().map(f => `
        <label class="sf-chk-item">
          <input type="checkbox" name="sfpf" value="${f.id}" ${f.type==='COMPULSORY'?'checked':''}>
          <span>${f.name} ${f.type==='COMPULSORY'?'<strong>(Compulsory)</strong>':'(Voluntary)'}</span>
        </label>`).join('') || '<span style="color:var(--text-muted);font-size:13px;">No fees available.</span>';
    }

    /* ===== periods tab ===== */
    function renderPeriods() {
      const showActions = !isResident;
      q('#sf-periods-tbody').innerHTML = FM.getPeriods().map(p => {
        const badge = p.status==='ACTIVE'
          ? '<span class="sf-badge green">Active</span>'
          : '<span class="sf-badge red">Closed</span>';
        const action = p.status==='ACTIVE'
          ? `<button class="sf-btn dan sf-close-p" data-id="${p.id}">Close Period</button>`
          : `<span style="font-size:11px;color:var(--text-muted);">—</span>`;
        return `<tr>
          <td><strong>${p.name}</strong><br><small style="color:var(--text-muted);">${p.id}</small></td>
          <td><span class="sf-badge blue">${p.feeIds.length} fees</span></td>
          <td>${badge}</td>
          ${showActions ? `<td>${action}</td>` : ''}
        </tr>`;
      }).join('') || `<tr><td colspan="${showActions ? 4 : 3}" style="text-align:center;color:var(--text-muted);padding:20px;">No periods available.</td></tr>`;

      if (showActions) {
        q('#sf-periods-tbody').querySelectorAll('.sf-close-p').forEach(b => b.addEventListener('click', () => {
          if (!confirm('Close this collection period?')) return;
          FM.closePeriod(b.dataset.id); showToast('Collection period closed','info'); renderAll();
        }));
      }
    }

    /* ===== households tab ===== */
    function renderHouseholds() {
      if (!selectedPeriodId) {
        q('#sf-hh-tbody').innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">Please create a collection period first!</td></tr>`;
        return;
      }
      const selOpt = q('#sf-period-sel option:checked');
      q('#sf-hh-pname').textContent = selOpt ? selOpt.textContent : '';

      const hhs = FM.getHouseholdsWithBill(selectedPeriodId);
      q('#sf-hh-tbody').innerHTML = hhs.map(hh => {
        const b = hh.calculatedBill;
        let badge = '';
        if (!b.items.length) badge = '<span class="sf-badge gray">No debt</span>';
        else if (b.totalUnpaid===0) badge = '<span class="sf-badge green">Completed</span>';
        else if (b.totalPaid>0) badge = '<span class="sf-badge yellow">Partial</span>';
        else badge = '<span class="sf-badge red">Unpaid</span>';
        return `<tr>
          <td><strong>${hh.id}</strong></td>
          <td>${hh.ownerName}</td>
          <td>${hh.membersCount}</td><td>${hh.area}</td>
          <td><strong>${vnd(b.totalAmount)}</strong></td>
          <td style="color:var(--color-success);">${vnd(b.totalPaid)}</td>
          <td style="color:var(--color-warning);">${vnd(b.totalUnpaid)}</td>
          <td>${badge}</td>
          <td style="text-align:center;"><button class="sf-btn pri sf-view-bill" data-id="${hh.id}">View Bill</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">No households available.</td></tr>`;

      q('#sf-hh-tbody').querySelectorAll('.sf-view-bill').forEach(b => b.addEventListener('click', () => openBillModal(b.dataset.id)));
    }

    /* ===== fee modal ===== */
    function openFeeModal(feeId = null) {
      closeAll(); q('#sf-fee-form').reset();
      if (feeId) {
        const f = FM.getFees().find(x => x.id === feeId);
        if (f) {
          q('#sf-fee-mtitle').textContent = 'Edit Fee';
          q('#sf-fee-eid').value = f.id;
          q('#sf-fee-name').value = f.name;
          q('#sf-fee-type').value = f.type;
          q('#sf-fee-calc').value = f.calcMethod;
          q('#sf-fee-price').value = f.price;
        }
      } else {
        q('#sf-fee-mtitle').textContent = 'Create New Fee';
        q('#sf-fee-eid').value = '';
      }
      open('sf-ov-fee');
    }

    /* ===== bill modal ===== */
    function openBillModal(hhId) {
      closeAll();
      const bill = FM.calcBill(hhId, selectedPeriodId);
      q('#sf-bill-title').textContent = `Household Bill for ${bill.householdId}`;
      q('#sf-bill-sub').textContent   = `${bill.ownerName} | ${bill.membersCount} members | ${bill.area} m²`;
      q('#sf-assign-form').setAttribute('data-hhid', hhId);
      q('#sf-bill-total').textContent  = vnd(bill.totalAmount);
      q('#sf-bill-paid').textContent   = vnd(bill.totalPaid);
      q('#sf-bill-unpaid').textContent = vnd(bill.totalUnpaid);

      const calcLbl = { FIXED:'Fixed', PER_MEMBER:'Members × Unit price', PER_AREA:'Area × Unit price', CONSUMPTION:'Consumption × Unit price', DONATION:'Voluntary donation' };

      q('#sf-bill-tbody').innerHTML = bill.items.map(item => {
        let qtyHtml = `<span style="color:var(--text-muted);">${item.quantity}</span>`;
        if (item.calcMethod === 'CONSUMPTION') {
          if (!isResident) {
            qtyHtml = `<input type="number" class="sf-qty-inp sf-qty-chg" value="${item.quantity}" min="0" data-fid="${item.feeId}" data-hhid="${hhId}"> m³`;
          } else {
            qtyHtml = `<span style="color:var(--text-muted);">${item.quantity} m³</span>`;
          }
        } else if (item.calcMethod === 'DONATION') {
          if (!isResident) {
            qtyHtml = `<input type="number" class="sf-qty-inp sf-qty-chg" style="width:110px;" value="${item.quantity}" min="0" data-fid="${item.feeId}" data-hhid="${hhId}"> VNĐ`;
          } else {
            qtyHtml = `<span style="color:var(--text-muted);">${vnd(item.quantity)}</span>`;
          }
        }
        const stBadge = item.status==='PAID'
          ? '<span class="sf-badge green">Paid</span>'
          : '<span class="sf-badge red">Unpaid</span>';
        const actions = item.status==='UNPAID'
          ? `<button class="sf-btn suc sf-pay" data-id="${item.assignedFeeId}">Pay</button>
             ${!isResident ? `<button class="sf-btn dan sf-unassign" data-fid="${item.feeId}" data-hhid="${hhId}">Unassign</button>` : ''}`
          : `${!isResident ? `<button class="sf-btn sec sf-unpay" data-id="${item.assignedFeeId}">Undo</button>` : ''}`;
        return `<tr>
          <td><strong>${item.feeName}</strong><br><small style="color:var(--text-muted);">${item.feeType==='COMPULSORY'?'Compulsory':'Voluntary'}</small></td>
          <td style="font-size:12px;color:var(--text-muted);">${calcLbl[item.calcMethod]||item.calcMethod}</td>
          <td>${qtyHtml}<br><small style="color:var(--text-muted);">Price: ${vnd(item.price)}</small></td>
          <td><strong>${vnd(item.amount)}</strong></td>
          <td>${stBadge}</td>
          <td style="text-align:right;"><div class="sf-btn-grp" style="justify-content:flex-end;">${actions}</div></td>
        </tr>`;
      }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No fees assigned.</td></tr>`;

      // bill events
      q('#sf-bill-tbody').querySelectorAll('.sf-qty-chg').forEach(inp => {
        inp.addEventListener('change', () => {
          FM.assignFee(hhId, selectedPeriodId, inp.dataset.fid, Number(inp.value));
          openBillModal(hhId); renderAll(); showToast('Consumption quantity updated','success');
        });
      });
      q('#sf-bill-tbody').querySelectorAll('.sf-pay').forEach(b => b.addEventListener('click', () => {
        FM.payFee(b.dataset.id); openBillModal(hhId); renderAll(); showToast('Payment successful!','success');
      }));
      q('#sf-bill-tbody').querySelectorAll('.sf-unpay').forEach(b => b.addEventListener('click', () => {
        FM.unpayFee(b.dataset.id); openBillModal(hhId); renderAll(); showToast('Payment undone','info');
      }));
      q('#sf-bill-tbody').querySelectorAll('.sf-unassign').forEach(b => b.addEventListener('click', () => {
        FM.unassignFee(hhId, selectedPeriodId, b.dataset.fid); openBillModal(hhId); renderAll(); showToast('Fee unassigned','info');
      }));

      // assign dropdown
      if (!isResident) {
        const period = FM.getPeriods().find(p => p.id === selectedPeriodId);
        const assignedIds = bill.items.map(i => i.feeId);
        const unassigned = period ? FM.getFees().filter(f => period.feeIds.includes(f.id) && !assignedIds.includes(f.id)) : [];
        q('#sf-assign-sel').innerHTML = unassigned.length
          ? `<option value="">-- Select Fee --</option>` + unassigned.map(f => `<option value="${f.id}">${f.name} — ${vnd(f.price)}</option>`).join('')
          : `<option disabled>(All fees assigned)</option>`;
      }

      open('sf-ov-bill');
    }

    /* ===== form events ===== */
    if (!isResident) {
      q('#sf-add-fee-btn').addEventListener('click', () => openFeeModal());

      q('#sf-fee-form').addEventListener('submit', e => {
        e.preventDefault();
        const id = q('#sf-fee-eid').value;
        const name = q('#sf-fee-name').value, type = q('#sf-fee-type').value,
              calc = q('#sf-fee-calc').value, price = Number(q('#sf-fee-price').value);
        if (id) { FM.updateFee(id, name, type, calc, price); showToast('Fee updated','success'); }
        else     { FM.createFee(name, type, calc, price);     showToast('New fee created','success'); }
        close('sf-ov-fee'); renderAll();
      });

      q('#sf-add-hh-btn').addEventListener('click', () => { q('#sf-hh-form').reset(); open('sf-ov-hh'); });

      q('#sf-hh-form').addEventListener('submit', e => {
        e.preventDefault();
        try {
          FM.createHousehold(
            q('#sf-hh-id').value.trim(),
            q('#sf-hh-owner').value.trim(),
            Number(q('#sf-hh-members').value),
            Number(q('#sf-hh-area').value),
            Number(q('#sf-hh-motos').value),
            Number(q('#sf-hh-cars').value)
          );
          showToast('New household added','success'); close('sf-ov-hh'); renderAll();
        } catch(err) { showToast(err.message,'error'); }
      });

      q('#sf-form-period').addEventListener('submit', e => {
        e.preventDefault();
        const feeIds = [...container.querySelectorAll('input[name="sfpf"]:checked')].map(c => c.value);
        if (!feeIds.length) { showToast('Select at least one fee!','warning'); return; }
        const p = FM.createPeriod(q('#sf-pname').value.trim(), feeIds);
        selectedPeriodId = p.id;
        q('#sf-pname').value = '';
        showToast('New collection period created','success'); renderAll();
      });

      q('#sf-assign-form').addEventListener('submit', e => {
        e.preventDefault();
        const hhId = q('#sf-assign-form').getAttribute('data-hhid');
        const feeId = q('#sf-assign-sel').value;
        if (!feeId) { showToast('Select a fee to assign','warning'); return; }
        FM.assignFee(hhId, selectedPeriodId, feeId, Number(q('#sf-assign-qty').value));
        showToast('Fee assigned','success'); openBillModal(hhId); renderAll();
      });
    }

    /* ===== boot ===== */
    renderAll();
  }
}

/* Expose FM globally so PaymentView can access shared data */
FM._getDB  = () => { try { return JSON.parse(localStorage.getItem(FM_KEY)) || fmGetDB(); } catch { return fmGetDB(); } };
FM._saveDB = (db) => fmSave(db);
export { FM };
