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

import { API } from '../api.js';

const FM_KEY = 'smartfee_v2_en';

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
/* ===== Seed data (port từ initSampleData() Java) ===== */
function fmSeed() {
  const fees = [
    { id: 'FEE001', name: 'Apartment Service Fee', type: 'COMPULSORY', calcMethod: 'PER_AREA', price: 15000 },
    { id: 'FEE002', name: 'Waste Cleaning Fee', type: 'COMPULSORY', calcMethod: 'PER_MEMBER', price: 72000 },
    { id: 'FEE003', name: 'Motorcycle Parking Fee', type: 'VOLUNTARY', calcMethod: 'PER_MOTORCYCLE', price: 70000 },
    { id: 'FEE004', name: 'Car Parking Fee', type: 'VOLUNTARY', calcMethod: 'PER_CAR', price: 150000 },
    { id: 'FEE005', name: 'Running Water Fee', type: 'COMPULSORY', calcMethod: 'CONSUMPTION', price: 15000 },
    { id: 'FEE006', name: 'Neighborhood Security Fee', type: 'COMPULSORY', calcMethod: 'PER_MEMBER', price: 10000 },
    { id: 'FEE007', name: 'Welfare Fund', type: 'VOLUNTARY', calcMethod: 'PER_MEMBER', price: 20000 },
    { id: 'FEE008', name: 'Invalids & Martyrs Day Contribution 27/07', type: 'VOLUNTARY', calcMethod: 'FIXED', price: 50000 },
    { id: 'FEE_DEBT', name: 'Previous Period Debt', type: 'COMPULSORY', calcMethod: 'FIXED', price: 1 },
  ];

  const allFeeIds = fees.map(f => f.id);

  const households = [
    { id: 'P101', ownerName: 'Nguyen Van Hung', membersCount: 4, area: 75.0, motorcycleCount: 2, carCount: 1 },
    { id: 'P102', ownerName: 'Tran Thi Tuyet', membersCount: 2, area: 60.0, motorcycleCount: 1, carCount: 0 },
    { id: 'P201', ownerName: 'Pham Minh Tuan', membersCount: 5, area: 110.0, motorcycleCount: 3, carCount: 1 },
    { id: 'P202', ownerName: 'Le Hoang Nam', membersCount: 3, area: 85.0, motorcycleCount: 2, carCount: 1 },
    { id: 'P301', ownerName: 'Hoang Duc Long', membersCount: 1, area: 45.0, motorcycleCount: 0, carCount: 0 },
  ];

  const periodId = uid('PER');
  const periods = [{ id: periodId, name: '2026 Collection Period', feeIds: allFeeIds, status: 'ACTIVE', createdAt: new Date().toISOString() }];

  const utilityRecords = [
    { id: 'UT001', householdId: 'P101', periodId, type: 'WATER', oldIndex: 100, newIndex: 118 },
    { id: 'UT002', householdId: 'P102', periodId, type: 'WATER', oldIndex: 200, newIndex: 208 },
    { id: 'UT003', householdId: 'P201', periodId, type: 'WATER', oldIndex: 150, newIndex: 175 },
    { id: 'UT004', householdId: 'P202', periodId, type: 'WATER', oldIndex: 120, newIndex: 132 },
    { id: 'UT005', householdId: 'P301', periodId, type: 'WATER', oldIndex: 80, newIndex: 85 },
  ];

  // Auto-assign logic
  let assignedFees = [];
  function autoAssign(hh, pId, fIds) {
    for (const feeId of fIds) {
      if (feeId === 'FEE_DEBT') continue;
      const fee = fees.find(f => f.id === feeId);
      if (!fee) continue;
      const already = assignedFees.some(a => a.householdId === hh.id && a.periodId === pId && a.feeId === feeId);
      if (already) continue;
      let shouldAssign = false, qty = 1;
      if (fee.type === 'COMPULSORY') {
        shouldAssign = true;
        if (fee.calcMethod === 'PER_MEMBER') qty = hh.membersCount;
        else if (fee.calcMethod === 'PER_AREA') qty = hh.area;
        else if (fee.calcMethod === 'CONSUMPTION') {
          const ur = utilityRecords.find(r => r.householdId === hh.id && r.periodId === pId && r.type === 'WATER');
          qty = ur ? (ur.newIndex - ur.oldIndex) : 0;
        }
      } else if (fee.calcMethod === 'PER_MOTORCYCLE' && hh.motorcycleCount > 0) {
        shouldAssign = true; qty = hh.motorcycleCount;
      } else if (fee.calcMethod === 'PER_CAR' && hh.carCount > 0) {
        shouldAssign = true; qty = hh.carCount;
      }
      if (shouldAssign) {
        assignedFees.push({ 
          id: uid('ASF'), 
          householdId: hh.id, 
          periodId: pId, 
          feeId, 
          quantity: qty, 
          status: 'UNPAID', 
          amountPaidAccumulated: 0, 
          paidAt: null 
        });
      }
    }
  }

  households.forEach(hh => autoAssign(hh, periodId, allFeeIds));

  // Seed P102 đã đóng một số phí
  assignedFees.forEach(af => {
    if (af.householdId === 'P102' && (af.feeId === 'FEE001' || af.feeId === 'FEE006')) {
      af.status = 'PAID'; 
      const fee = fees.find(f => f.id === af.feeId);
      const hh = households.find(h => h.id === af.householdId);
      af.amountPaidAccumulated = fee.price * (fee.calcMethod === 'PER_AREA' ? hh.area : hh.membersCount);
      af.paidAt = new Date().toISOString();
    }
  });

  return { fees, periods, households, assignedFees, utilityRecords };
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
      throw new Error(`Household ID "${id}" already exists!`);
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
    if (af) { af.status = 'UNPAID'; af.paidAt = null; af.amountPaidAccumulated = 0; }
    fmSave(db);
  },

  updateUtilityIndex(householdId, periodId, feeId, oldIndex, newIndex) {
    const db = fmGetDB();
    if (!db.utilityRecords) db.utilityRecords = [];
    let ur = db.utilityRecords.find(r => r.householdId === householdId && r.periodId === periodId && r.type === 'WATER');
    if (!ur) {
      ur = { id: uid('UT'), householdId, periodId, type: 'WATER', oldIndex, newIndex };
      db.utilityRecords.push(ur);
    } else {
      ur.oldIndex = oldIndex;
      ur.newIndex = newIndex;
    }
    const af = db.assignedFees.find(a => a.householdId === householdId && a.periodId === periodId && a.feeId === feeId);
    if (af) {
      af.quantity = newIndex - oldIndex;
    }
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
      const paid = af.amountPaidAccumulated || (af.status === 'PAID' ? amount : 0);
      const unpaid = amount - paid;
      totalPaid += paid;
      totalUnpaid += unpaid;
      totalAmount += amount;
      items.push({ 
        assignedFeeId: af.id, 
        feeId: fee.id, 
        feeName: fee.name, 
        feeType: fee.type, 
        calcMethod: fee.calcMethod, 
        price: fee.price, 
        quantity: af.quantity, 
        amount, 
        amountPaidAccumulated: paid,
        status: af.status, 
        paidAt: af.paidAt 
      });
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
      const paid = af.amountPaidAccumulated || (af.status === 'PAID' ? amount : 0);
      totalCollected += paid;
      if (af.status === 'PAID') { paidAssignments++; }
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
    // 1. Quét nợ cũ của hộ từ các đợt thu trước
    let totalDebt = 0;
    db.assignedFees.filter(a => a.householdId === hh.id && a.periodId !== periodId && (a.status === 'UNPAID' || a.status === 'PARTIAL')).forEach(af => {
      const fee = db.fees.find(f => f.id === af.feeId);
      if (!fee) return;
      const req = fee.price * af.quantity;
      const paid = af.amountPaidAccumulated || 0;
      const debt = req - paid;
      if (debt > 0) {
        totalDebt += debt;
      }
    });

    if (totalDebt > 0) {
      let debtFee = db.fees.find(f => f.id === 'FEE_DEBT');
      if (!debtFee) {
        debtFee = { id: 'FEE_DEBT', name: 'Previous Period Debt', type: 'COMPULSORY', calcMethod: 'FIXED', price: 1 };
        db.fees.push(debtFee);
      }
      const hasDebtAssign = db.assignedFees.some(a => a.householdId === hh.id && a.periodId === periodId && a.feeId === 'FEE_DEBT');
      if (!hasDebtAssign) {
        db.assignedFees.push({ 
          id: uid('ASF'), 
          householdId: hh.id, 
          periodId, 
          feeId: 'FEE_DEBT', 
          quantity: totalDebt, 
          status: 'UNPAID', 
          amountPaidAccumulated: 0, 
          paidAt: null 
        });
      }
    }

    // 2. Gán các khoản phí bắt buộc và tự động khác
    for (const feeId of feeIds) {
      if (feeId === 'FEE_DEBT') continue;
      const fee = db.fees.find(f => f.id === feeId);
      if (!fee) continue;
      const already = db.assignedFees.some(a => a.householdId === hh.id && a.periodId === periodId && a.feeId === feeId);
      if (already) continue;
      let shouldAssign = false, qty = 1;
      if (fee.type === 'COMPULSORY') {
        shouldAssign = true;
        if (fee.calcMethod === 'PER_MEMBER') qty = hh.membersCount;
        else if (fee.calcMethod === 'PER_AREA') qty = hh.area;
        else if (fee.calcMethod === 'CONSUMPTION') {
          if (!db.utilityRecords) db.utilityRecords = [];
          let ur = db.utilityRecords.find(r => r.householdId === hh.id && r.periodId === periodId && r.type === 'WATER');
          if (!ur) {
            const lastUr = db.utilityRecords.filter(r => r.householdId === hh.id && r.type === 'WATER').sort((a, b) => b.id.localeCompare(a.id))[0];
            const oldIdx = lastUr ? lastUr.newIndex : 0;
            ur = { id: uid('UT'), householdId: hh.id, periodId, type: 'WATER', oldIndex: oldIdx, newIndex: oldIdx };
            db.utilityRecords.push(ur);
          }
          qty = ur.newIndex - ur.oldIndex;
        }
      } else if (fee.calcMethod === 'PER_MOTORCYCLE' && hh.motorcycleCount > 0) {
        shouldAssign = true; qty = hh.motorcycleCount;
      } else if (fee.calcMethod === 'PER_CAR' && hh.carCount > 0) {
        shouldAssign = true; qty = hh.carCount;
      }
      if (shouldAssign) {
        db.assignedFees.push({ 
          id: uid('ASF'), 
          householdId: hh.id, 
          periodId, 
          feeId, 
          quantity: qty, 
          status: 'UNPAID', 
          amountPaidAccumulated: 0,
          paidAt: null 
        });
      }
    }
  },
};

/* ===================================================================
   RENDER — Full UI (không cần server)
   =================================================================== */
export class FeeManagerView {
  static render(container, showToast, user) {
    if (!user) return;
    const isResident = user.role === 'user';
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
            <h2 class="card-title" style="margin-bottom:4px;">SmartFee — Fee Management</h2>
            <p class="card-title-muted">Data saved directly on the browser (localStorage) • Ported from Java Backend</p>
          </div>
          ${!isResident ? `<button class="btn btn-secondary" id="sf-reset-btn" style="font-size:12px;padding:8px 14px;">Reset Sample Data</button>` : ''}
        </div>

        <div class="sf-period-bar">
          <label>Selected Collection Period:</label>
          <select class="sf-sel" id="sf-period-sel"></select>
        </div>

        <div class="sf-tabs">
          <button class="sf-tab ${!isResident ? 'active' : ''}" data-sf="sf-db">Dashboard</button>
          <button class="sf-tab" data-sf="sf-fees">Fees</button>
          <button class="sf-tab" data-sf="sf-periods">Periods</button>
          <button class="sf-tab ${isResident ? 'active' : ''}" data-sf="sf-hh">Households & Invoices</button>
        </div>

        <!-- DASHBOARD -->
        <div class="sf-panel ${!isResident ? 'active' : ''}" id="sf-db">
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
            <h3>Collection Period Details</h3>
            <div style="display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass);font-size:14px;"><span style="color:var(--text-secondary);">Period ID</span><strong id="sf-sm-id">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass);font-size:14px;"><span style="color:var(--text-secondary);">Total Assignments</span><strong id="sf-sm-total">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;"><span style="color:var(--text-secondary);">Paid Assignments</span><strong id="sf-sm-paid">—</strong></div>
            </div>
          </div>
        </div>

        <!-- FEES -->
        <div class="sf-panel" id="sf-fees">
          <div class="sf-card">
            <div class="sf-row">
              <h3 style="margin:0;">Fee Registry</h3>
              ${!isResident ? `<button class="sf-btn pri" id="sf-add-fee-btn">+ Create New Fee</button>` : ''}
            </div>
            <div class="sf-tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>ID</th><th>Fee Name</th><th>Type</th><th>Calculation Method</th><th>Price</th>${!isResident ? `<th style="text-align:right;">Actions</th>` : ''}</tr></thead>
                <tbody id="sf-fees-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PERIODS -->
        <div class="sf-panel" id="sf-periods">
          <div class="sf-2col" style="${isResident ? 'grid-template-columns:1fr;' : ''}">
            ${!isResident ? `
            <div class="sf-card">
              <h3>Create New Period</h3>
              <form class="sf-form" id="sf-form-period">
                <div class="sf-field"><label>Period name</label><input type="text" id="sf-pname" placeholder="e.g. June 2026 Collection Cycle" required /></div>
                <div class="sf-field"><label>Applicable fees</label><div class="sf-chk-list" id="sf-pchk"></div></div>
                <button type="submit" class="sf-btn pri" style="width:100%;">Create & Auto-assign Compulsory Fees</button>
              </form>
            </div>
            ` : ''}
            <div class="sf-card" style="${isResident ? 'grid-column:span 2;' : ''}">
              <h3>Existing Collection Periods</h3>
              <div class="sf-tbl-wrap">
                <table class="sf-tbl">
                  <thead><tr><th>Collection Period</th><th>Fees</th><th>Status</th>${!isResident ? `<th>Actions</th>` : ''}</tr></thead>
                  <tbody id="sf-periods-tbody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- HOUSEHOLDS -->
        <div class="sf-panel ${isResident ? 'active' : ''}" id="sf-hh">
          <div class="sf-card">
            <div class="sf-row">
              <span style="font-size:14px;color:var(--text-secondary);">Collection Period: <strong id="sf-hh-pname" style="color:var(--color-primary);">—</strong></span>
              ${!isResident ? `<button class="sf-btn sec" id="sf-add-hh-btn">+ Add Household</button>` : ''}
            </div>
            <div class="sf-tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Household ID</th><th>Owner</th><th>Members</th><th>Area (m²)</th><th>Total Amount</th><th style="color:var(--color-success);">Paid</th><th style="color:var(--color-warning);">Unpaid</th><th>Status</th><th>Details</th></tr></thead>
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
                <div class="sf-field"><label>Calculation Method</label><select id="sf-fee-calc"><option value="FIXED">Fixed</option><option value="PER_MEMBER">Per Member</option><option value="PER_AREA">Per Area</option><option value="CONSUMPTION">Consumption</option></select></div>
              </div>
              <div class="sf-field"><label>Unit price (VND) *</label><input type="number" id="sf-fee-price" min="0" placeholder="50000" required /></div>
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
              <div class="sf-field"><label>Owner Full Name *</label><input type="text" id="sf-hh-owner" placeholder="e.g. John Doe" required /></div>
              <div class="sf-2field">
                <div class="sf-field"><label>Members Count</label><input type="number" id="sf-hh-members" min="1" placeholder="4" required /></div>
                <div class="sf-field"><label>Area (m²)</label><input type="number" id="sf-hh-area" min="1" placeholder="75" required /></div>
              </div>
              <div class="sf-2field">
                <div class="sf-field"><label>Motorcycle Count</label><input type="number" id="sf-hh-motos" min="0" value="0" /></div>
                <div class="sf-field"><label>Car Count</label><input type="number" id="sf-hh-cars" min="0" value="0" /></div>
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
            <div><h3 id="sf-bill-title">Household Invoice</h3><p id="sf-bill-sub"></p></div>
            <button class="sf-xbtn" data-sfclose="sf-ov-bill">&times;</button>
          </div>
          <div class="sf-mb" style="padding:0;flex:1;overflow:hidden;">
            <div class="sf-bill-grid" style="height:100%;">
              <div class="sf-bill-l">
                <table class="sf-tbl" style="min-width:500px;">
                  <thead><tr><th>Fee Name</th><th>Method</th><th>Qty / Unit Price</th><th>Total</th><th>Status</th>${!isResident ? `<th style="text-align:right;">Actions</th>` : ''}</tr></thead>
                  <tbody id="sf-bill-tbody"></tbody>
                </table>
              </div>
              <div class="sf-bill-r">
                <div class="sf-totals">
                  <h4>Invoice Summary</h4>
                  <div class="sf-trow"><span>Total Expected</span><span class="amt" id="sf-bill-total">0 ₫</span></div>
                  <div class="sf-trow"><span>Total Paid</span><span class="amt" style="color:var(--color-success);" id="sf-bill-paid">0 ₫</span></div>
                  <div class="sf-trow bt"><span>Remaining Debt</span><span class="amt" style="color:var(--color-warning);" id="sf-bill-unpaid">0 ₫</span></div>
                </div>
                <div class="sf-card" style="margin-bottom:0;">
                  <h3 style="margin-bottom:14px;font-size:14px;">Assign Additional Fee</h3>
                  <form class="sf-form" id="sf-assign-form">
                    <div class="sf-field"><label>Voluntary Fee</label><select class="sf-sel" id="sf-assign-sel" style="width:100%;"></select></div>
                    <div class="sf-field"><label>Quantity</label><input type="number" id="sf-assign-qty" min="1" value="1" /></div>
                    <button type="submit" class="sf-btn pri" style="width:100%;">Assign Fee</button>
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
    const vnd = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    const open = id => container.querySelector('#' + id).classList.add('active');
    const close = id => container.querySelector('#' + id).classList.remove('active');
    const closeAll = () => ['sf-ov-fee', 'sf-ov-hh', 'sf-ov-bill'].forEach(close);

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
      if (!confirm('Delete all data and restore sample data?')) return;
      FM.resetSeed(); selectedPeriodId = '';
      refreshPeriodSel(); renderAll();
      showToast('Sample data has been reset', 'info');
    });

    // Period select
    q('#sf-period-sel').addEventListener('change', e => { selectedPeriodId = e.target.value; renderAll(); });

    /* ===== period select ===== */
    function refreshPeriodSel() {
      const periods = FM.getPeriods();
      const sel = q('#sf-period-sel');
      sel.innerHTML = '';
      if (!periods.length) { sel.innerHTML = '<option value="">(No period created)</option>'; selectedPeriodId = ''; return; }
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
      q('#sf-s-exp').textContent = vnd(s.totalExpected);
      q('#sf-s-col').textContent = vnd(s.totalCollected);
      q('#sf-s-rem').textContent = vnd(s.totalRemaining);
      q('#sf-s-rate').textContent = s.completionRate + '%';
      q('#sf-prog').style.width = s.completionRate + '%';
      q('#sf-sm-id').textContent = s.periodId;
      q('#sf-sm-total').textContent = s.totalAssignments + ' assignments';
      q('#sf-sm-paid').textContent = s.paidAssignments + ' paid';
    }

    /* ===== fees tab ===== */
    function renderFees() {
      const calcMap = { FIXED: 'Fixed', PER_MEMBER: 'Per Member', PER_AREA: 'Per Area', CONSUMPTION: 'Consumption' };
      q('#sf-fees-tbody').innerHTML = FM.getFees().map(f => `
        <tr>
          <td><strong>${f.id}</strong></td>
          <td>${f.name}</td>
          <td><span class="sf-badge ${f.type === 'COMPULSORY' ? 'blue' : 'cyan'}">${f.type === 'COMPULSORY' ? 'Compulsory' : 'Voluntary'}</span></td>
          <td>${calcMap[f.calcMethod] || f.calcMethod}</td>
          <td><strong>${vnd(f.price)}</strong></td>
          ${!isResident ? `
          <td style="text-align:right;"><div class="sf-btn-grp" style="justify-content:flex-end;">
            <button class="sf-btn sec sf-edit-fee" data-id="${f.id}">Edit</button>
            <button class="sf-btn dan sf-del-fee" data-id="${f.id}">Delete</button>
          </div></td>` : ''}
        </tr>`).join('') || `<tr><td colspan="${isResident ? 5 : 6}" style="text-align:center;color:var(--text-muted);padding:20px;">No fees found.</td></tr>`;

      if (!isResident) {
        q('#sf-fees-tbody').querySelectorAll('.sf-del-fee').forEach(b => b.addEventListener('click', () => {
          if (!confirm(`Delete fee "${b.dataset.id}"? This action will cascade delete periods and assignments.`)) return;
          FM.deleteFee(b.dataset.id); showToast('Fee deleted', 'info'); renderAll();
        }));
        q('#sf-fees-tbody').querySelectorAll('.sf-edit-fee').forEach(b => b.addEventListener('click', () => openFeeModal(b.dataset.id)));
      }
    }

    /* ===== period checkboxes ===== */
    function renderPeriodCheckboxes() {
      q('#sf-pchk').innerHTML = FM.getFees().map(f => `
        <label class="sf-chk-item">
          <input type="checkbox" name="sfpf" value="${f.id}" ${f.type === 'COMPULSORY' ? 'checked' : ''}>
          <span>${f.name} ${f.type === 'COMPULSORY' ? '<strong>(Compulsory)</strong>' : '(Voluntary)'}</span>
        </label>`).join('') || '<span style="color:var(--text-muted);font-size:13px;">No fees found.</span>';
    }

    /* ===== periods tab ===== */
    function renderPeriods() {
      q('#sf-periods-tbody').innerHTML = FM.getPeriods().map(p => {
        const badge = p.status === 'ACTIVE'
          ? '<span class="sf-badge green">Active</span>'
          : '<span class="sf-badge red">Closed</span>';
        const action = p.status === 'ACTIVE'
          ? `<button class="sf-btn dan sf-close-p" data-id="${p.id}">Close Period</button>`
          : `<span style="font-size:11px;color:var(--text-muted);">—</span>`;
        return `<tr>
          <td><strong>${p.name}</strong><br><small style="color:var(--text-muted);">${p.id}</small></td>
          <td><span class="sf-badge blue">${p.feeIds.length} fees</span></td>
          <td>${badge}</td>
          ${!isResident ? `<td>${action}</td>` : ''}
          </tr>`;
      }).join('') || `<tr><td colspan="${isResident ? 3 : 4}" style="text-align:center;color:var(--text-muted);padding:20px;">No periods found.</td></tr>`;

      if (!isResident) {
        q('#sf-periods-tbody').querySelectorAll('.sf-close-p').forEach(b => b.addEventListener('click', () => {
          if (!confirm('Close this collection period?')) return;
          FM.closePeriod(b.dataset.id); showToast('Period closed', 'info'); renderAll();
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

      let hhs = FM.getHouseholdsWithBill(selectedPeriodId);
      if (isResident) {
        hhs = hhs.filter(hh => hh.id === user.room || hh.ownerName === user.fullname);
      }
      q('#sf-hh-tbody').innerHTML = hhs.map(hh => {
        const b = hh.calculatedBill;
        let badge = '';
        if (!b.items.length) badge = '<span class="sf-badge gray">No Debt</span>';
        else if (b.totalUnpaid === 0) badge = '<span class="sf-badge green">Paid</span>';
        else if (b.totalPaid > 0) badge = '<span class="sf-badge yellow">Partial</span>';
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
      }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">No households found.</td></tr>`;

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
      q('#sf-bill-title').textContent = `Invoice for Unit ${bill.householdId}`;
      q('#sf-bill-sub').textContent = `${bill.ownerName} | ${bill.membersCount} Members | ${bill.area} m²`;
      q('#sf-assign-form').setAttribute('data-hhid', hhId);
      q('#sf-bill-total').textContent = vnd(bill.totalAmount);
      q('#sf-bill-paid').textContent = vnd(bill.totalPaid);
      q('#sf-bill-unpaid').textContent = vnd(bill.totalUnpaid);

      const assignCard = q('#sf-ov-bill').querySelector('.sf-bill-r .sf-card');
      if (assignCard) {
        assignCard.style.display = isResident ? 'none' : 'block';
      }

      q('#sf-ov-bill').querySelector('thead tr').innerHTML = `
        <th>Fee Name</th><th>Method</th><th>Qty / Unit Price</th><th>Total</th><th>Status</th>
        ${!isResident ? '<th style="text-align:right;">Actions</th>' : ''}
      `;

      const calcLbl = { FIXED: 'Fixed', PER_MEMBER: 'Members × Unit Price', PER_AREA: 'Area × Unit Price', CONSUMPTION: 'Consumption × Unit Price', PER_MOTORCYCLE: 'Motorcycle × Unit Price', PER_CAR: 'Car × Unit Price' };

      q('#sf-bill-tbody').innerHTML = bill.items.map(item => {
        let qtyHtml = `<span style="color:var(--text-muted);">${item.quantity}</span>`;
        if (item.calcMethod === 'CONSUMPTION') {
          const db = fmGetDB();
          if (!db.utilityRecords) db.utilityRecords = [];
          let ur = db.utilityRecords.find(r => r.householdId === hhId && r.periodId === selectedPeriodId && r.type === 'WATER');
          if (!ur) {
            ur = { oldIndex: 0, newIndex: 0 };
          }
          if (!isResident) {
            qtyHtml = `
              <div style="display:inline-flex;align-items:center;gap:4px;">
                Old: <input type="number" class="sf-qty-inp sf-index-old" value="${ur.oldIndex}" min="0" style="width:45px;padding:2px 4px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-glass);" data-fid="${item.feeId}">
                New: <input type="number" class="sf-qty-inp sf-index-new" value="${ur.newIndex}" min="0" style="width:45px;padding:2px 4px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-glass);" data-fid="${item.feeId}">
                <span style="font-size:11px;">(${item.quantity} m³)</span>
              </div>
            `;
          } else {
            qtyHtml = `<span style="color:var(--text-muted);">${item.quantity} m³ (${ur.oldIndex} → ${ur.newIndex})</span>`;
          }
        }
        let stBadge = '<span class="sf-badge red">Unpaid</span>';
        if (item.status === 'PAID') {
          stBadge = '<span class="sf-badge green">Paid</span>';
        } else if (item.status === 'PARTIAL') {
          stBadge = `<span class="sf-badge" style="background:#f59e0b;color:#fff;">Partial (${vnd(item.amountPaidAccumulated)})</span>`;
        }
        const actions = (item.status === 'UNPAID' || item.status === 'PARTIAL')
          ? `<button class="sf-btn suc sf-pay" data-id="${item.assignedFeeId}">Pay</button>
             <button class="sf-btn dan sf-unassign" data-fid="${item.feeId}" data-hhid="${hhId}">Unassign</button>`
          : `<button class="sf-btn sec sf-unpay" data-id="${item.assignedFeeId}">Undo</button>`;
        return `<tr>
          <td><strong>${item.feeName}</strong><br><small style="color:var(--text-muted);">${item.feeType === 'COMPULSORY' ? 'Compulsory' : 'Voluntary'}</small></td>
          <td style="font-size:12px;color:var(--text-muted);">${calcLbl[item.calcMethod] || item.calcMethod}</td>
          <td>${qtyHtml}<br><small style="color:var(--text-muted);">Price: ${vnd(item.price)}</small></td>
          <td><strong>${vnd(item.amount)}</strong></td>
          <td>${stBadge}</td>
          ${!isResident ? `<td style="text-align:right;"><div class="sf-btn-grp" style="justify-content:flex-end;">${actions}</div></td>` : ''}
        </tr>`;
      }).join('') || `<tr><td colspan="${isResident ? 5 : 6}" style="text-align:center;color:var(--text-muted);padding:20px;">No fees assigned.</td></tr>`;

      // bill events
      q('#sf-bill-tbody').querySelectorAll('.sf-index-old, .sf-index-new').forEach(inp => {
        inp.addEventListener('change', () => {
          const fid = inp.dataset.fid;
          const tr = inp.closest('tr');
          const oldVal = Number(tr.querySelector('.sf-index-old').value) || 0;
          const newVal = Number(tr.querySelector('.sf-index-new').value) || 0;
          FM.updateUtilityIndex(hhId, selectedPeriodId, fid, oldVal, newVal);
          openBillModal(hhId); renderAll(); showToast('Updated consumption indexes', 'success');
        });
      });
      q('#sf-bill-tbody').querySelectorAll('.sf-pay').forEach(b => b.addEventListener('click', async () => {
        const isBackend = await API.checkHealth();
        if (isBackend) {
          try {
            const receipt = await API.recordPayment(b.dataset.id, 0, 'Paid fee from bill details');
            FM.payFee(b.dataset.id); // local synchronization
            showToast('Payment successful (Backend)!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        } else {
          FM.payFee(b.dataset.id);
          showToast('Payment successful!', 'success');
        }
        openBillModal(hhId); renderAll();
      }));
      q('#sf-bill-tbody').querySelectorAll('.sf-unpay').forEach(b => b.addEventListener('click', () => {
        FM.unpayFee(b.dataset.id); openBillModal(hhId); renderAll(); showToast('Payment payment undone', 'info');
      }));
      q('#sf-bill-tbody').querySelectorAll('.sf-unassign').forEach(b => b.addEventListener('click', () => {
        if (!confirm('Unassign this fee?')) return;
        FM.unassignFee(hhId, selectedPeriodId, b.dataset.fid); openBillModal(hhId); renderAll(); showToast('Fee unassigned', 'info');
      }));

      // assign dropdown
      const period = FM.getPeriods().find(p => p.id === selectedPeriodId);
      const assignedIds = bill.items.map(i => i.feeId);
      const unassigned = period ? FM.getFees().filter(f => period.feeIds.includes(f.id) && !assignedIds.includes(f.id)) : [];
      q('#sf-assign-sel').innerHTML = unassigned.length
        ? `<option value="">-- Select Fee --</option>` + unassigned.map(f => `<option value="${f.id}">${f.name} — ${vnd(f.price)}</option>`).join('')
        : `<option disabled>(All assigned)</option>`;

      open('sf-ov-bill');
    }

    /* ===== form events ===== */
    const addFeeBtn = q('#sf-add-fee-btn');
    if (addFeeBtn) {
      addFeeBtn.addEventListener('click', () => openFeeModal());
    }

    const feeForm = q('#sf-fee-form');
    if (feeForm) {
      feeForm.addEventListener('submit', e => {
        e.preventDefault();
        const id = q('#sf-fee-eid').value;
        const name = q('#sf-fee-name').value, type = q('#sf-fee-type').value,
          calc = q('#sf-fee-calc').value, price = Number(q('#sf-fee-price').value);
        if (id) { FM.updateFee(id, name, type, calc, price); showToast('Fee updated', 'success'); }
        else { FM.createFee(name, type, calc, price); showToast('Fee created', 'success'); }
        close('sf-ov-fee'); renderAll();
      });
    }

    const addHhBtn = q('#sf-add-hh-btn');
    if (addHhBtn) {
      addHhBtn.addEventListener('click', () => { q('#sf-hh-form').reset(); open('sf-ov-hh'); });
    }

    const hhForm = q('#sf-hh-form');
    if (hhForm) {
      hhForm.addEventListener('submit', e => {
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
          showToast('Household added', 'success'); close('sf-ov-hh'); renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      });
    }

    const formPeriod = q('#sf-form-period');
    if (formPeriod) {
      formPeriod.addEventListener('submit', e => {
        e.preventDefault();
        const feeIds = [...container.querySelectorAll('input[name="sfpf"]:checked')].map(c => c.value);
        if (!feeIds.length) { showToast('Select at least one fee!', 'warning'); return; }
        const p = FM.createPeriod(q('#sf-pname').value.trim(), feeIds);
        selectedPeriodId = p.id;
        q('#sf-pname').value = '';
        showToast('Collection period created', 'success'); renderAll();
      });
    }

    const assignForm = q('#sf-assign-form');
    if (assignForm) {
      assignForm.addEventListener('submit', e => {
        e.preventDefault();
        const hhId = q('#sf-assign-form').getAttribute('data-hhid');
        const feeId = q('#sf-assign-sel').value;
        if (!feeId) { showToast('Select fee to assign', 'warning'); return; }
        FM.assignFee(hhId, selectedPeriodId, feeId, Number(q('#sf-assign-qty').value));
        showToast('Fee assigned', 'success'); openBillModal(hhId); renderAll();
      });
    }

    /* ===== boot ===== */
    renderAll();
  }
}

/* Expose FM globally so PaymentView can access shared data */
FM._getDB = () => { try { return JSON.parse(localStorage.getItem(FM_KEY)) || fmGetDB(); } catch { return fmGetDB(); } };
FM._saveDB = (db) => fmSave(db);
export { FM };
