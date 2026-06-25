/**
 * FEE MODELS — Fee, Household, Period, AssignedFee, Receipt, Resident
 * Port từ Java FeeManager: logic nghiệp vụ tính phí, gán phí, thanh toán.
 */

const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('../utils/database');

// ════════════════════════════════════════════════════════════
// HELPER: Tính số tiền theo calcMethod
// ════════════════════════════════════════════════════════════
function calcAmount(fee, household, quantity) {
  if (!fee) return 0;
  switch (fee.calcMethod) {
    case 'FIXED':       return fee.price;
    case 'PER_MEMBER':  return fee.price * (household?.membersCount || 1);
    case 'PER_AREA':    return fee.price * (household?.area || 1);
    case 'CONSUMPTION': return fee.price * (quantity || 0);
    default:            return fee.price * (quantity || 1);
  }
}

// ════════════════════════════════════════════════════════════
// FEE — Khoản thu
// ════════════════════════════════════════════════════════════
class Fee {
  static findAll()     { return readCollection('fees'); }
  static findById(id)  { return readCollection('fees').find(f => f.id === id); }

  static create(data) {
    const fees = readCollection('fees');
    const fee = {
      id: uuidv4(),
      name: data.name.trim(),
      type: data.type || 'COMPULSORY',           // COMPULSORY | VOLUNTARY
      calcMethod: data.calcMethod || 'FIXED',    // FIXED | PER_MEMBER | PER_AREA | CONSUMPTION
      price: Number(data.price),
      createdAt: new Date().toISOString()
    };
    fees.push(fee);
    writeCollection('fees', fees);
    return fee;
  }

  static update(id, data) {
    const fees = readCollection('fees');
    const fee = fees.find(f => f.id === id);
    if (!fee) throw Object.assign(new Error('Fee not found'), { status: 404 });
    if (data.name)       fee.name       = data.name.trim();
    if (data.type)       fee.type       = data.type;
    if (data.calcMethod) fee.calcMethod = data.calcMethod;
    if (data.price !== undefined) fee.price = Number(data.price);
    writeCollection('fees', fees);
    return fee;
  }

  static delete(id) {
    let fees = readCollection('fees');
    const idx = fees.findIndex(f => f.id === id);
    if (idx === -1) throw Object.assign(new Error('Fee not found'), { status: 404 });
    fees.splice(idx, 1);
    writeCollection('fees', fees);
    return true;
  }
}

// ════════════════════════════════════════════════════════════
// HOUSEHOLD — Hộ gia đình
// ════════════════════════════════════════════════════════════
class Household {
  static findAll()     { return readCollection('households'); }
  static findById(id)  { return readCollection('households').find(h => h.id === id); }

  static create(data) {
    const households = readCollection('households');
    if (households.some(h => h.id === data.id)) {
      throw Object.assign(new Error('Household ID already exists'), { status: 409 });
    }
    const hh = {
      id: String(data.id).trim().toUpperCase(),
      ownerName: data.ownerName.trim(),
      membersCount: Number(data.membersCount) || 1,
      area: Number(data.area) || 0,
      motorcycleCount: Number(data.motorcycleCount) || 0,
      carCount: Number(data.carCount) || 0,
      createdAt: new Date().toISOString()
    };
    households.push(hh);
    writeCollection('households', households);
    return hh;
  }

  static update(id, data) {
    const households = readCollection('households');
    const hh = households.find(h => h.id === id);
    if (!hh) throw Object.assign(new Error('Household not found'), { status: 404 });
    if (data.ownerName      !== undefined) hh.ownerName      = data.ownerName.trim();
    if (data.membersCount   !== undefined) hh.membersCount   = Number(data.membersCount);
    if (data.area           !== undefined) hh.area           = Number(data.area);
    if (data.motorcycleCount !== undefined) hh.motorcycleCount = Number(data.motorcycleCount);
    if (data.carCount       !== undefined) hh.carCount       = Number(data.carCount);
    writeCollection('households', households);
    return hh;
  }

  static delete(id) {
    let households = readCollection('households');
    if (!households.find(h => h.id === id)) throw Object.assign(new Error('Household not found'), { status: 404 });
    households = households.filter(h => h.id !== id);
    writeCollection('households', households);
    return true;
  }
}

// ════════════════════════════════════════════════════════════
// PERIOD — Đợt thu phí
// ════════════════════════════════════════════════════════════
class Period {
  static findAll()     { return readCollection('periods'); }
  static findById(id)  { return readCollection('periods').find(p => p.id === id); }

  static create(data) {
    const periods    = readCollection('periods');
    const fees       = readCollection('fees');
    const households = readCollection('households');

    const feeIds = data.feeIds || fees.filter(f => f.type === 'COMPULSORY').map(f => f.id);

    const period = {
      id: uuidv4(),
      name: data.name.trim(),
      feeIds,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    periods.push(period);
    writeCollection('periods', periods);

    // Auto-assign phí bắt buộc cho tất cả hộ
    const assignedFees = readCollection('assigned_fees');
    for (const hh of households) {
      for (const feeId of feeIds) {
        const fee = fees.find(f => f.id === feeId);
        if (!fee) continue;
        const already = assignedFees.some(a => a.householdId === hh.id && a.periodId === period.id && a.feeId === feeId);
        if (already) continue;

        let shouldAssign = false, qty = 1;
        if (fee.type === 'COMPULSORY') {
          shouldAssign = true;
          if (fee.calcMethod === 'PER_MEMBER') qty = hh.membersCount;
          else if (fee.calcMethod === 'PER_AREA') qty = hh.area;
          else if (fee.calcMethod === 'CONSUMPTION') qty = 0;
        }
        if (shouldAssign) {
          assignedFees.push({ id: uuidv4(), householdId: hh.id, periodId: period.id, feeId, quantity: qty, status: 'UNPAID', paidAt: null });
        }
      }
    }
    writeCollection('assigned_fees', assignedFees);
    return period;
  }

  static updateStatus(id, status) {
    const periods = readCollection('periods');
    const period = periods.find(p => p.id === id);
    if (!period) throw Object.assign(new Error('Period not found'), { status: 404 });
    period.status = status;
    writeCollection('periods', periods);
    return period;
  }

  /** Thống kê tiến độ thu phí của 1 đợt */
  static getStats(periodId) {
    const period  = this.findById(periodId);
    if (!period) throw Object.assign(new Error('Period not found'), { status: 404 });

    const allAFs  = readCollection('assigned_fees').filter(a => a.periodId === periodId);
    const fees    = readCollection('fees');
    const households = readCollection('households');

    const total  = allAFs.length;
    const paid   = allAFs.filter(a => a.status === 'PAID').length;
    const unpaid = total - paid;

    let totalAmount = 0, paidAmount = 0;
    for (const af of allAFs) {
      const fee = fees.find(f => f.id === af.feeId);
      const hh  = households.find(h => h.id === af.householdId);
      const amt = calcAmount(fee, hh, af.quantity);
      totalAmount += amt;
      if (af.status === 'PAID') paidAmount += amt;
    }

    return { period, total, paid, unpaid, totalAmount, paidAmount, unpaidAmount: totalAmount - paidAmount };
  }
}

// ════════════════════════════════════════════════════════════
// ASSIGNED FEE — Khoản phí gán cho hộ
// ════════════════════════════════════════════════════════════
class AssignedFee {
  static findAll()          { return readCollection('assigned_fees'); }
  static findByPeriod(pId)  { return readCollection('assigned_fees').filter(a => a.periodId === pId); }
  static findByHousehold(hhId) { return readCollection('assigned_fees').filter(a => a.householdId === hhId); }

  static findDetailed(periodId) {
    const afs  = this.findByPeriod(periodId);
    const fees = readCollection('fees');
    const hhs  = readCollection('households');

    return afs.map(af => {
      const fee = fees.find(f => f.id === af.feeId);
      const hh  = hhs.find(h => h.id === af.householdId);
      return { ...af, fee, household: hh, amount: calcAmount(fee, hh, af.quantity) };
    });
  }

  /** Gán phí tự nguyện hoặc cập nhật số lượng */
  static upsert(data) {
    const afs = readCollection('assigned_fees');
    const existing = afs.find(a =>
      a.householdId === data.householdId &&
      a.periodId    === data.periodId    &&
      a.feeId       === data.feeId
    );
    if (existing) {
      existing.quantity = Number(data.quantity);
      writeCollection('assigned_fees', afs);
      return existing;
    }
    const newAf = {
      id: uuidv4(),
      householdId: data.householdId,
      periodId: data.periodId,
      feeId: data.feeId,
      quantity: Number(data.quantity) || 1,
      status: 'UNPAID',
      paidAt: null
    };
    afs.push(newAf);
    writeCollection('assigned_fees', afs);
    return newAf;
  }

  static delete(id) {
    let afs = readCollection('assigned_fees');
    if (!afs.find(a => a.id === id)) throw Object.assign(new Error('AssignedFee not found'), { status: 404 });
    afs = afs.filter(a => a.id !== id);
    writeCollection('assigned_fees', afs);
    return true;
  }
}

// ════════════════════════════════════════════════════════════
// RECEIPT — Biên lai thanh toán
// ════════════════════════════════════════════════════════════
class Receipt {
  static findAll()             { return readCollection('receipts'); }
  static findByHousehold(hhId) { return readCollection('receipts').filter(r => r.householdId === hhId); }
  static findByPeriod(pId)     { return readCollection('receipts').filter(r => r.periodId === pId); }

  /**
   * Ghi nhận thanh toán → sinh biên lai
   */
  static pay(assignedFeeId, { amountPaid, note, createdBy }) {
    const afs  = readCollection('assigned_fees');
    const af   = afs.find(a => a.id === assignedFeeId);
    if (!af) throw Object.assign(new Error('AssignedFee not found'), { status: 404 });
    if (af.status === 'PAID') throw Object.assign(new Error('This fee has already been paid.'), { status: 409 });

    const fees = readCollection('fees');
    const hhs  = readCollection('households');
    const fee  = fees.find(f => f.id === af.feeId);
    const hh   = hhs.find(h => h.id === af.householdId);
    const amountRequired = calcAmount(fee, hh, af.quantity);

    // Cập nhật trạng thái
    af.status = 'PAID';
    af.paidAt = new Date().toISOString();
    writeCollection('assigned_fees', afs);

    // Tạo biên lai
    const receipts = readCollection('receipts');
    const receipt = {
      id: 'REC_' + uuidv4().slice(0, 8).toUpperCase(),
      assignedFeeId,
      householdId: af.householdId,
      periodId: af.periodId,
      feeId: af.feeId,
      amountRequired,
      amountPaid: amountPaid || amountRequired,
      paidAt: new Date().toISOString(),
      note: note || '',
      createdBy: createdBy || 'system',
      createdAt: new Date().toISOString()
    };
    receipts.unshift(receipt);
    writeCollection('receipts', receipts);
    return receipt;
  }

  /**
   * Hoàn tác thanh toán
   */
  static undo(assignedFeeId) {
    const afs = readCollection('assigned_fees');
    const af  = afs.find(a => a.id === assignedFeeId);
    if (af) { af.status = 'UNPAID'; af.paidAt = null; }
    writeCollection('assigned_fees', afs);

    let receipts = readCollection('receipts');
    receipts = receipts.filter(r => r.assignedFeeId !== assignedFeeId);
    writeCollection('receipts', receipts);
    return true;
  }

  /**
   * Thống kê tổng quan
   */
  static getStats() {
    const receipts   = readCollection('receipts');
    const afs        = readCollection('assigned_fees');
    const fees       = readCollection('fees');
    const hhs        = readCollection('households');

    const totalCollected = receipts.reduce((s, r) => s + (r.amountPaid || 0), 0);

    // Đếm theo tháng (6 tháng gần nhất)
    const monthlyMap = {};
    receipts.forEach(r => {
      const key = r.paidAt ? r.paidAt.slice(0, 7) : 'unknown';
      monthlyMap[key] = (monthlyMap[key] || 0) + r.amountPaid;
    });

    // Top debtors — hộ nợ nhiều nhất
    const unpaidAFs = afs.filter(a => a.status === 'UNPAID');
    const debtMap   = {};
    for (const af of unpaidAFs) {
      const fee = fees.find(f => f.id === af.feeId);
      const hh  = hhs.find(h => h.id === af.householdId);
      const amt = calcAmount(fee, hh, af.quantity);
      debtMap[af.householdId] = (debtMap[af.householdId] || 0) + amt;
    }
    const topDebtors = Object.entries(debtMap)
      .map(([hhId, amount]) => ({ householdId: hhId, ownerName: hhs.find(h => h.id === hhId)?.ownerName, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalReceipts: receipts.length,
      totalCollected,
      monthlyBreakdown: Object.entries(monthlyMap).sort().map(([month, amount]) => ({ month, amount })),
      topDebtors
    };
  }
}

// ════════════════════════════════════════════════════════════
// RESIDENT — Nhân khẩu
// ════════════════════════════════════════════════════════════
class Resident {
  static findAll()             { return readCollection('residents'); }
  static findByHousehold(hhId) { return readCollection('residents').filter(r => r.householdId === hhId); }
  static findById(id)          { return readCollection('residents').find(r => r.id === id); }

  static create(data) {
    const residents = readCollection('residents');
    const hh = readCollection('households').find(h => h.id === data.householdId);
    if (!hh) throw Object.assign(new Error('Household not found'), { status: 404 });

    const resident = {
      id: uuidv4(),
      householdId: data.householdId,
      fullName: data.fullName.trim(),
      dob: data.dob || '',
      gender: data.gender || 'Unknown',
      relationship: data.relationship || '',
      identityNo: data.identityNo || '',
      phone: data.phone || '',
      occupation: data.occupation || '',
      createdAt: new Date().toISOString()
    };
    residents.push(resident);
    writeCollection('residents', residents);
    return resident;
  }

  static update(id, data) {
    const residents = readCollection('residents');
    const r = residents.find(r => r.id === id);
    if (!r) throw Object.assign(new Error('Resident not found'), { status: 404 });
    Object.assign(r, {
      fullName: data.fullName?.trim() || r.fullName,
      dob: data.dob ?? r.dob,
      gender: data.gender ?? r.gender,
      relationship: data.relationship ?? r.relationship,
      identityNo: data.identityNo ?? r.identityNo,
      phone: data.phone ?? r.phone,
      occupation: data.occupation ?? r.occupation
    });
    writeCollection('residents', residents);
    return r;
  }

  static delete(id) {
    let residents = readCollection('residents');
    if (!residents.find(r => r.id === id)) throw Object.assign(new Error('Resident not found'), { status: 404 });
    residents = residents.filter(r => r.id !== id);
    writeCollection('residents', residents);
    return true;
  }
}

module.exports = { Fee, Household, Period, AssignedFee, Receipt, Resident, calcAmount };
