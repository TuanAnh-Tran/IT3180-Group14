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
    { id: uid('FEE'), name: 'Phí dịch vụ chung cư',  type: 'COMPULSORY', calcMethod: 'PER_AREA',    price: 7000  },
    { id: uid('FEE'), name: 'Phí gửi xe máy',         type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 70000 },
    { id: uid('FEE'), name: 'Tiền nước sinh hoạt',    type: 'COMPULSORY', calcMethod: 'CONSUMPTION', price: 15000 },
    { id: uid('FEE'), name: 'Quỹ ủng hộ bão lũ',      type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 50000 },
    { id: uid('FEE'), name: 'Phí an ninh tổ dân phố', type: 'COMPULSORY', calcMethod: 'PER_MEMBER',  price: 10000 },
    { id: uid('FEE'), name: 'Phí gửi xe ô tô',        type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 1200000 },
  ];

  const [f1, f2, f3, f4, f5, f6] = fees;
  const allFeeIds = fees.map(f => f.id);

  const households = [
    { id: 'P101', ownerName: 'Nguyen Van Hung',   membersCount: 4, area: 75.0,  motorcycleCount: 2, carCount: 1 },
    { id: 'P102', ownerName: 'Tran Thi Tuyet',    membersCount: 2, area: 60.0,  motorcycleCount: 1, carCount: 0 },
    { id: 'P201', ownerName: 'Pham Minh Tuan',    membersCount: 5, area: 110.0, motorcycleCount: 3, carCount: 1 },
    { id: 'P202', ownerName: 'Le Hoang Nam',      membersCount: 3, area: 85.0,  motorcycleCount: 2, carCount: 1 },
    { id: 'P301', ownerName: 'Hoang Duc Long',    membersCount: 1, area: 45.0,  motorcycleCount: 0, carCount: 0 },
  ];

  const periodId = uid('PER');
  const periods = [{ id: periodId, name: 'Đợt thu phí tháng 05/2026', feeIds: allFeeIds, status: 'ACTIVE', createdAt: new Date().toISOString() }];

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
      } else if (fee.name === 'Phí gửi xe máy' && hh.motorcycleCount > 0) {
        shouldAssign = true; qty = hh.motorcycleCount;
      } else if (fee.name === 'Phí gửi xe ô tô' && hh.carCount > 0) {
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

  setQty('P101', f3.id, 18); setQty('P101', f4.id, 1);
  setQty('P102', f3.id, 8);
  setQty('P201', f3.id, 25); setQty('P201', f4.id, 2);
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
      throw new Error(`Mã hộ "${id}" đã tồn tại!`);
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
      } else if (fee.name === 'Phí gửi xe máy' && hh.motorcycleCount > 0) {
        shouldAssign = true; qty = hh.motorcycleCount;
      } else if (fee.name === 'Phí gửi xe ô tô' && hh.carCount > 0) {
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
  static render(container, showToast) {
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
            <h2 class="card-title" style="margin-bottom:4px;">SmartFee — Quản Lý Thu Phí</h2>
            <p class="card-title-muted">Dữ liệu lưu trực tiếp trên trình duyệt (localStorage) • Port từ Java Backend</p>
          </div>
          <button class="btn btn-secondary" id="sf-reset-btn" style="font-size:12px;padding:8px 14px;">Reset dữ liệu mẫu</button>
        </div>

        <div class="sf-period-bar">
          <label>Đợt thu đang xem:</label>
          <select class="sf-sel" id="sf-period-sel"></select>
        </div>

        <div class="sf-tabs">
          <button class="sf-tab active" data-sf="sf-db">Bảng Điều Khiển</button>
          <button class="sf-tab" data-sf="sf-fees">Khoản Thu</button>
          <button class="sf-tab" data-sf="sf-periods">Đợt Thu</button>
          <button class="sf-tab" data-sf="sf-hh">Hộ Dân & Hóa Đơn</button>
        </div>

        <!-- DASHBOARD -->
        <div class="sf-panel active" id="sf-db">
          <div class="sf-stats-grid">
            <div class="sf-stat"><div class="lbl">Tổng Cần Thu</div><div class="val" id="sf-s-exp">—</div></div>
            <div class="sf-stat"><div class="lbl">Đã Thu</div><div class="val green" id="sf-s-col">—</div></div>
            <div class="sf-stat"><div class="lbl">Còn Nợ</div><div class="val yellow" id="sf-s-rem">—</div></div>
            <div class="sf-stat">
              <div class="lbl">Tỷ Lệ Hoàn Thành</div>
              <div class="val blue" id="sf-s-rate">—</div>
              <div class="sf-prog-track"><div class="sf-prog-fill" id="sf-prog" style="width:0%"></div></div>
            </div>
          </div>
          <div class="sf-card">
            <h3>Chi Tiết Đợt Thu</h3>
            <div style="display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass);font-size:14px;"><span style="color:var(--text-secondary);">Mã đợt thu</span><strong id="sf-sm-id">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass);font-size:14px;"><span style="color:var(--text-secondary);">Tổng lượt gán phí</span><strong id="sf-sm-total">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;"><span style="color:var(--text-secondary);">Đã thanh toán</span><strong id="sf-sm-paid">—</strong></div>
            </div>
          </div>
        </div>

        <!-- FEES -->
        <div class="sf-panel" id="sf-fees">
          <div class="sf-card">
            <div class="sf-row"><h3 style="margin:0;">Danh sách Khoản Thu</h3><button class="sf-btn pri" id="sf-add-fee-btn">+ Tạo Khoản Thu Mới</button></div>
            <div class="sf-tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Mã</th><th>Tên Khoản Thu</th><th>Loại</th><th>Cách Tính</th><th>Đơn Giá</th><th style="text-align:right;">Hành Động</th></tr></thead>
                <tbody id="sf-fees-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PERIODS -->
        <div class="sf-panel" id="sf-periods">
          <div class="sf-2col">
            <div class="sf-card">
              <h3>Tạo Đợt Thu Mới</h3>
              <form class="sf-form" id="sf-form-period">
                <div class="sf-field"><label>Tên đợt thu</label><input type="text" id="sf-pname" placeholder="VD: Thu phí tháng 06/2026" required /></div>
                <div class="sf-field"><label>Khoản thu áp dụng</label><div class="sf-chk-list" id="sf-pchk"></div></div>
                <button type="submit" class="sf-btn pri" style="width:100%;">Tạo & gán tự động khoản bắt buộc</button>
              </form>
            </div>
            <div class="sf-card">
              <h3>Các Đợt Thu Đang Có</h3>
              <div class="sf-tbl-wrap">
                <table class="sf-tbl"><thead><tr><th>Đợt Thu</th><th>Khoản Thu</th><th>Trạng Thái</th><th>Hành Động</th></tr></thead><tbody id="sf-periods-tbody"></tbody></table>
              </div>
            </div>
          </div>
        </div>

        <!-- HOUSEHOLDS -->
        <div class="sf-panel" id="sf-hh">
          <div class="sf-card">
            <div class="sf-row">
              <span style="font-size:14px;color:var(--text-secondary);">Đợt thu: <strong id="sf-hh-pname" style="color:var(--color-primary);">—</strong></span>
              <button class="sf-btn sec" id="sf-add-hh-btn">+ Thêm Hộ Dân</button>
            </div>
            <div class="sf-tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Mã Hộ</th><th>Chủ Hộ</th><th>NK</th><th>DT (m²)</th><th>Phải Đóng</th><th style="color:var(--color-success);">Đã Đóng</th><th style="color:var(--color-warning);">Còn Nợ</th><th>Trạng Thái</th><th>Chi Tiết</th></tr></thead>
                <tbody id="sf-hh-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: FEE FORM -->
      <div class="sf-ov" id="sf-ov-fee">
        <div class="sf-modal sf-modal-sm">
          <div class="sf-mh"><h3 id="sf-fee-mtitle">Tạo Khoản Thu Mới</h3><button class="sf-xbtn" data-sfclose="sf-ov-fee">&times;</button></div>
          <div class="sf-mb">
            <form class="sf-form" id="sf-fee-form">
              <input type="hidden" id="sf-fee-eid" />
              <div class="sf-field"><label>Tên khoản thu *</label><input type="text" id="sf-fee-name" placeholder="VD: Phí vệ sinh..." required /></div>
              <div class="sf-2field">
                <div class="sf-field"><label>Tính chất</label><select id="sf-fee-type"><option value="COMPULSORY">Bắt buộc</option><option value="VOLUNTARY">Tự nguyện</option></select></div>
                <div class="sf-field"><label>Cách tính</label><select id="sf-fee-calc"><option value="FIXED">Cố định</option><option value="PER_MEMBER">Theo nhân khẩu</option><option value="PER_AREA">Theo diện tích</option><option value="CONSUMPTION">Theo tiêu thụ</option></select></div>
              </div>
              <div class="sf-field"><label>Đơn giá (VND) *</label><input type="number" id="sf-fee-price" min="0" placeholder="50000" required /></div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" class="sf-btn sec" data-sfclose="sf-ov-fee">Hủy</button>
                <button type="submit" class="sf-btn pri">Lưu Khoản Thu</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL: HOUSEHOLD FORM -->
      <div class="sf-ov" id="sf-ov-hh">
        <div class="sf-modal sf-modal-sm">
          <div class="sf-mh"><h3>Thêm Hộ Gia Đình Mới</h3><button class="sf-xbtn" data-sfclose="sf-ov-hh">&times;</button></div>
          <div class="sf-mb">
            <form class="sf-form" id="sf-hh-form">
              <div class="sf-field"><label>Mã hộ *</label><input type="text" id="sf-hh-id" placeholder="VD: P105" required /></div>
              <div class="sf-field"><label>Họ tên chủ hộ *</label><input type="text" id="sf-hh-owner" placeholder="VD: Trần Văn A" required /></div>
              <div class="sf-2field">
                <div class="sf-field"><label>Số nhân khẩu</label><input type="number" id="sf-hh-members" min="1" placeholder="4" required /></div>
                <div class="sf-field"><label>Diện tích (m²)</label><input type="number" id="sf-hh-area" min="1" placeholder="75" required /></div>
              </div>
              <div class="sf-2field">
                <div class="sf-field"><label>Số xe máy</label><input type="number" id="sf-hh-motos" min="0" value="0" /></div>
                <div class="sf-field"><label>Số ô tô</label><input type="number" id="sf-hh-cars" min="0" value="0" /></div>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" class="sf-btn sec" data-sfclose="sf-ov-hh">Hủy</button>
                <button type="submit" class="sf-btn pri">Thêm Hộ Dân</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL: BILL DETAIL -->
      <div class="sf-ov" id="sf-ov-bill">
        <div class="sf-modal sf-modal-lg" style="height:85vh;">
          <div class="sf-mh" style="background:linear-gradient(135deg,var(--bg-tertiary),var(--bg-secondary));">
            <div><h3 id="sf-bill-title">Hóa Đơn Hộ Dân</h3><p id="sf-bill-sub"></p></div>
            <button class="sf-xbtn" data-sfclose="sf-ov-bill">&times;</button>
          </div>
          <div class="sf-mb" style="padding:0;flex:1;overflow:hidden;">
            <div class="sf-bill-grid" style="height:100%;">
              <div class="sf-bill-l">
                <table class="sf-tbl" style="min-width:500px;">
                  <thead><tr><th>Khoản Thu</th><th>Công Thức</th><th>Lượng / Đơn Giá</th><th>Thành Tiền</th><th>TT</th><th style="text-align:right;">Thao Tác</th></tr></thead>
                  <tbody id="sf-bill-tbody"></tbody>
                </table>
              </div>
              <div class="sf-bill-r">
                <div class="sf-totals">
                  <h4>Tổng Cộng Hóa Đơn</h4>
                  <div class="sf-trow"><span>Tổng phải đóng</span><span class="amt" id="sf-bill-total">0 ₫</span></div>
                  <div class="sf-trow"><span>Đã đóng</span><span class="amt" style="color:var(--color-success);" id="sf-bill-paid">0 ₫</span></div>
                  <div class="sf-trow bt"><span>Còn nợ</span><span class="amt" style="color:var(--color-warning);" id="sf-bill-unpaid">0 ₫</span></div>
                </div>
                <div class="sf-card" style="margin-bottom:0;">
                  <h3 style="margin-bottom:14px;font-size:14px;">Gán Thêm Khoản Thu</h3>
                  <form class="sf-form" id="sf-assign-form">
                    <div class="sf-field"><label>Khoản thu tự nguyện</label><select class="sf-sel" id="sf-assign-sel" style="width:100%;"></select></div>
                    <div class="sf-field"><label>Số lượng</label><input type="number" id="sf-assign-qty" min="1" value="1" /></div>
                    <button type="submit" class="sf-btn pri" style="width:100%;">Đăng Ký Khoản Này</button>
                  </form>
                </div>
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
      if (!periods.length) { sel.innerHTML = '<option value="">(Chưa có đợt thu)</option>'; selectedPeriodId = ''; return; }
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
      if (!selectedPeriodId) return;
      const s = FM.calcStats(selectedPeriodId);
      q('#sf-s-exp').textContent  = vnd(s.totalExpected);
      q('#sf-s-col').textContent  = vnd(s.totalCollected);
      q('#sf-s-rem').textContent  = vnd(s.totalRemaining);
      q('#sf-s-rate').textContent = s.completionRate + '%';
      q('#sf-prog').style.width   = s.completionRate + '%';
      q('#sf-sm-id').textContent    = s.periodId;
      q('#sf-sm-total').textContent = s.totalAssignments + ' lượt';
      q('#sf-sm-paid').textContent  = s.paidAssignments + ' lượt';
    }

    /* ===== fees tab ===== */
    function renderFees() {
      const calcMap = { FIXED:'Cố định', PER_MEMBER:'Theo nhân khẩu', PER_AREA:'Theo diện tích', CONSUMPTION:'Theo tiêu thụ' };
      q('#sf-fees-tbody').innerHTML = FM.getFees().map(f => `
        <tr>
          <td><strong>${f.id}</strong></td>
          <td>${f.name}</td>
          <td><span class="sf-badge ${f.type==='COMPULSORY'?'blue':'cyan'}">${f.type==='COMPULSORY'?'Bắt buộc':'Tự nguyện'}</span></td>
          <td>${calcMap[f.calcMethod]||f.calcMethod}</td>
          <td><strong>${vnd(f.price)}</strong></td>
          <td style="text-align:right;"><div class="sf-btn-grp" style="justify-content:flex-end;">
            <button class="sf-btn sec sf-edit-fee" data-id="${f.id}">Sửa</button>
            <button class="sf-btn dan sf-del-fee" data-id="${f.id}">Xóa</button>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có khoản thu nào.</td></tr>`;

      q('#sf-fees-tbody').querySelectorAll('.sf-del-fee').forEach(b => b.addEventListener('click', () => {
        if (!confirm(`Xóa khoản thu "${b.dataset.id}"? Hành động này sẽ xóa cascade (đợt thu, lượt gán).`)) return;
        FM.deleteFee(b.dataset.id); showToast('Đã xóa khoản thu','info'); renderAll();
      }));
      q('#sf-fees-tbody').querySelectorAll('.sf-edit-fee').forEach(b => b.addEventListener('click', () => openFeeModal(b.dataset.id)));
    }

    /* ===== period checkboxes ===== */
    function renderPeriodCheckboxes() {
      q('#sf-pchk').innerHTML = FM.getFees().map(f => `
        <label class="sf-chk-item">
          <input type="checkbox" name="sfpf" value="${f.id}" ${f.type==='COMPULSORY'?'checked':''}>
          <span>${f.name} ${f.type==='COMPULSORY'?'<strong>(Bắt buộc)</strong>':'(Tự nguyện)'}</span>
        </label>`).join('') || '<span style="color:var(--text-muted);font-size:13px;">Chưa có khoản thu nào.</span>';
    }

    /* ===== periods tab ===== */
    function renderPeriods() {
      q('#sf-periods-tbody').innerHTML = FM.getPeriods().map(p => {
        const badge = p.status==='ACTIVE'
          ? '<span class="sf-badge green">Đang hoạt động</span>'
          : '<span class="sf-badge red">Đã đóng</span>';
        const action = p.status==='ACTIVE'
          ? `<button class="sf-btn dan sf-close-p" data-id="${p.id}">Đóng Đợt</button>`
          : `<span style="font-size:11px;color:var(--text-muted);">—</span>`;
        return `<tr>
          <td><strong>${p.name}</strong><br><small style="color:var(--text-muted);">${p.id}</small></td>
          <td><span class="sf-badge blue">${p.feeIds.length} khoản</span></td>
          <td>${badge}</td><td>${action}</td></tr>`;
      }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có đợt thu nào.</td></tr>`;

      q('#sf-periods-tbody').querySelectorAll('.sf-close-p').forEach(b => b.addEventListener('click', () => {
        if (!confirm('Đóng đợt thu này?')) return;
        FM.closePeriod(b.dataset.id); showToast('Đã đóng đợt thu','info'); renderAll();
      }));
    }

    /* ===== households tab ===== */
    function renderHouseholds() {
      if (!selectedPeriodId) {
        q('#sf-hh-tbody').innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">Vui lòng tạo đợt thu trước!</td></tr>`;
        return;
      }
      const selOpt = q('#sf-period-sel option:checked');
      q('#sf-hh-pname').textContent = selOpt ? selOpt.textContent : '';

      const hhs = FM.getHouseholdsWithBill(selectedPeriodId);
      q('#sf-hh-tbody').innerHTML = hhs.map(hh => {
        const b = hh.calculatedBill;
        let badge = '';
        if (!b.items.length) badge = '<span class="sf-badge gray">Không nợ</span>';
        else if (b.totalUnpaid===0) badge = '<span class="sf-badge green">Hoàn thành</span>';
        else if (b.totalPaid>0) badge = '<span class="sf-badge yellow">Đang đóng dở</span>';
        else badge = '<span class="sf-badge red">Chưa đóng</span>';
        return `<tr>
          <td><strong>${hh.id}</strong></td>
          <td>${hh.ownerName}</td>
          <td>${hh.membersCount}</td><td>${hh.area}</td>
          <td><strong>${vnd(b.totalAmount)}</strong></td>
          <td style="color:var(--color-success);">${vnd(b.totalPaid)}</td>
          <td style="color:var(--color-warning);">${vnd(b.totalUnpaid)}</td>
          <td>${badge}</td>
          <td style="text-align:center;"><button class="sf-btn pri sf-view-bill" data-id="${hh.id}">Xem HĐ</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">Chưa có hộ gia đình nào.</td></tr>`;

      q('#sf-hh-tbody').querySelectorAll('.sf-view-bill').forEach(b => b.addEventListener('click', () => openBillModal(b.dataset.id)));
    }

    /* ===== fee modal ===== */
    function openFeeModal(feeId = null) {
      closeAll(); q('#sf-fee-form').reset();
      if (feeId) {
        const f = FM.getFees().find(x => x.id === feeId);
        if (f) {
          q('#sf-fee-mtitle').textContent = 'Chỉnh Sửa Khoản Thu';
          q('#sf-fee-eid').value = f.id;
          q('#sf-fee-name').value = f.name;
          q('#sf-fee-type').value = f.type;
          q('#sf-fee-calc').value = f.calcMethod;
          q('#sf-fee-price').value = f.price;
        }
      } else {
        q('#sf-fee-mtitle').textContent = 'Tạo Khoản Thu Mới';
        q('#sf-fee-eid').value = '';
      }
      open('sf-ov-fee');
    }

    /* ===== bill modal ===== */
    function openBillModal(hhId) {
      closeAll();
      const bill = FM.calcBill(hhId, selectedPeriodId);
      q('#sf-bill-title').textContent = `Hóa Đơn Hộ ${bill.householdId}`;
      q('#sf-bill-sub').textContent   = `${bill.ownerName} | ${bill.membersCount} nhân khẩu | ${bill.area} m²`;
      q('#sf-assign-form').setAttribute('data-hhid', hhId);
      q('#sf-bill-total').textContent  = vnd(bill.totalAmount);
      q('#sf-bill-paid').textContent   = vnd(bill.totalPaid);
      q('#sf-bill-unpaid').textContent = vnd(bill.totalUnpaid);

      const calcLbl = { FIXED:'Cố định', PER_MEMBER:'Nhân khẩu × Đơn giá', PER_AREA:'Diện tích × Đơn giá', CONSUMPTION:'Tiêu thụ × Đơn giá' };

      q('#sf-bill-tbody').innerHTML = bill.items.map(item => {
        let qtyHtml = `<span style="color:var(--text-muted);">${item.quantity}</span>`;
        if (item.calcMethod === 'CONSUMPTION')
          qtyHtml = `<input type="number" class="sf-qty-inp sf-qty-chg" value="${item.quantity}" min="0" data-fid="${item.feeId}" data-hhid="${hhId}"> m³`;
        const stBadge = item.status==='PAID'
          ? '<span class="sf-badge green">Đã TT</span>'
          : '<span class="sf-badge red">Chưa TT</span>';
        const actions = item.status==='UNPAID'
          ? `<button class="sf-btn suc sf-pay" data-id="${item.assignedFeeId}">Đóng tiền</button>
             <button class="sf-btn dan sf-unassign" data-fid="${item.feeId}" data-hhid="${hhId}">Hủy gán</button>`
          : `<button class="sf-btn sec sf-unpay" data-id="${item.assignedFeeId}">Hoàn tác</button>`;
        return `<tr>
          <td><strong>${item.feeName}</strong><br><small style="color:var(--text-muted);">${item.feeType==='COMPULSORY'?'Bắt buộc':'Tự nguyện'}</small></td>
          <td style="font-size:12px;color:var(--text-muted);">${calcLbl[item.calcMethod]||item.calcMethod}</td>
          <td>${qtyHtml}<br><small style="color:var(--text-muted);">Đơn giá: ${vnd(item.price)}</small></td>
          <td><strong>${vnd(item.amount)}</strong></td>
          <td>${stBadge}</td>
          <td style="text-align:right;"><div class="sf-btn-grp" style="justify-content:flex-end;">${actions}</div></td>
        </tr>`;
      }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Chưa được gán khoản thu nào.</td></tr>`;

      // bill events
      q('#sf-bill-tbody').querySelectorAll('.sf-qty-chg').forEach(inp => {
        inp.addEventListener('change', () => {
          FM.assignFee(hhId, selectedPeriodId, inp.dataset.fid, Number(inp.value));
          openBillModal(hhId); renderAll(); showToast('Đã cập nhật chỉ số tiêu thụ','success');
        });
      });
      q('#sf-bill-tbody').querySelectorAll('.sf-pay').forEach(b => b.addEventListener('click', () => {
        FM.payFee(b.dataset.id); openBillModal(hhId); renderAll(); showToast('Thanh toán thành công!','success');
      }));
      q('#sf-bill-tbody').querySelectorAll('.sf-unpay').forEach(b => b.addEventListener('click', () => {
        FM.unpayFee(b.dataset.id); openBillModal(hhId); renderAll(); showToast('Đã hoàn tác thanh toán','info');
      }));
      q('#sf-bill-tbody').querySelectorAll('.sf-unassign').forEach(b => b.addEventListener('click', () => {
        if (!confirm('Hủy gán khoản thu này?')) return;
        FM.unassignFee(hhId, selectedPeriodId, b.dataset.fid); openBillModal(hhId); renderAll(); showToast('Đã hủy gán','info');
      }));

      // assign dropdown
      const period = FM.getPeriods().find(p => p.id === selectedPeriodId);
      const assignedIds = bill.items.map(i => i.feeId);
      const unassigned = period ? FM.getFees().filter(f => period.feeIds.includes(f.id) && !assignedIds.includes(f.id)) : [];
      q('#sf-assign-sel').innerHTML = unassigned.length
        ? `<option value="">-- Chọn khoản thu --</option>` + unassigned.map(f => `<option value="${f.id}">${f.name} — ${vnd(f.price)}</option>`).join('')
        : `<option disabled>(Đã gán toàn bộ)</option>`;

      open('sf-ov-bill');
    }

    /* ===== form events ===== */
    q('#sf-add-fee-btn').addEventListener('click', () => openFeeModal());

    q('#sf-fee-form').addEventListener('submit', e => {
      e.preventDefault();
      const id = q('#sf-fee-eid').value;
      const name = q('#sf-fee-name').value, type = q('#sf-fee-type').value,
            calc = q('#sf-fee-calc').value, price = Number(q('#sf-fee-price').value);
      if (id) { FM.updateFee(id, name, type, calc, price); showToast('Đã cập nhật khoản thu','success'); }
      else     { FM.createFee(name, type, calc, price);     showToast('Đã tạo khoản thu mới','success'); }
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
        showToast('Đã thêm hộ dân mới','success'); close('sf-ov-hh'); renderAll();
      } catch(err) { showToast(err.message,'error'); }
    });

    q('#sf-form-period').addEventListener('submit', e => {
      e.preventDefault();
      const feeIds = [...container.querySelectorAll('input[name="sfpf"]:checked')].map(c => c.value);
      if (!feeIds.length) { showToast('Chọn ít nhất một khoản thu!','warning'); return; }
      const p = FM.createPeriod(q('#sf-pname').value.trim(), feeIds);
      selectedPeriodId = p.id;
      q('#sf-pname').value = '';
      showToast('Đã tạo đợt thu mới','success'); renderAll();
    });

    q('#sf-assign-form').addEventListener('submit', e => {
      e.preventDefault();
      const hhId = q('#sf-assign-form').getAttribute('data-hhid');
      const feeId = q('#sf-assign-sel').value;
      if (!feeId) { showToast('Chọn khoản thu để gán','warning'); return; }
      FM.assignFee(hhId, selectedPeriodId, feeId, Number(q('#sf-assign-qty').value));
      showToast('Đã gán khoản thu','success'); openBillModal(hhId); renderAll();
    });

    /* ===== boot ===== */
    renderAll();
  }
}

/* Expose FM globally so PaymentView can access shared data */
FM._getDB  = () => { try { return JSON.parse(localStorage.getItem(FM_KEY)) || fmGetDB(); } catch { return fmGetDB(); } };
FM._saveDB = (db) => fmSave(db);
export { FM };
