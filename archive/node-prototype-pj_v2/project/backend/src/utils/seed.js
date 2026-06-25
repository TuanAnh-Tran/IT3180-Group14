/**
 * SEED DATA — Khởi tạo dữ liệu mẫu ban đầu
 * Chạy 1 lần khi database chưa có dữ liệu.
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('./database');

async function seedDatabase() {
  // Kiểm tra nếu đã có users thì bỏ qua
  const existingUsers = readCollection('users');
  if (existingUsers.length > 0) {
    console.log('✅ Database đã có dữ liệu, bỏ qua seed.');
    return;
  }

  console.log('🌱 Đang khởi tạo dữ liệu mẫu...');

  const saltRounds = 10;

  // ── USERS ──────────────────────────────────────────────────
  const users = [
    {
      id: uuidv4(),
      username: 'admin',
      fullname: 'System Administrator',
      passwordHash: await bcrypt.hash('admin123', saltRounds),
      role: 'admin',
      room: 'BQL-01',
      phone: '02412345678',
      createdAt: new Date().toISOString(),
      // Household info
      householdCode: 'HH-ADMIN',
      householdHeadName: 'System Admin',
      houseNo: '1',
      street: 'Tech Street',
      ward: 'Cyber Ward',
      district: 'Cyberspace District',
      // Resident info
      alias: 'Admin',
      dob: '1990-01-01',
      birthPlace: 'Hanoi',
      hometown: 'Hanoi',
      ethnicity: 'Kinh',
      occupation: 'SysAdmin',
      workplace: 'Management Office',
      identityNo: '001000000001',
      issueDate: '2015-05-05',
      issuePlace: 'Police Dept',
      previousResidence: 'Hanoi'
    },
    {
      id: uuidv4(),
      username: 'resident1',
      fullname: 'Michael Scott',
      passwordHash: await bcrypt.hash('user123', saltRounds),
      role: 'user',
      room: 'A1201',
      phone: '0912345678',
      createdAt: new Date().toISOString(),
      householdCode: 'HH-A1201',
      householdHeadName: 'Nguyen Van An',
      houseNo: 'A1201',
      street: 'BlueMoon Street',
      ward: 'Me Tri Ward',
      district: 'Nam Tu Liem District',
      alias: 'Mike',
      dob: '1985-04-12',
      birthPlace: 'Scranton',
      hometown: 'Hanoi',
      ethnicity: 'Kinh',
      occupation: 'Manager',
      workplace: 'Dunder Mifflin',
      identityNo: '001085000111',
      issueDate: '2016-06-12',
      issuePlace: 'Police Dept',
      previousResidence: 'Pennsylvania'
    },
    {
      id: uuidv4(),
      username: 'resident2',
      fullname: 'Jim Halpert',
      passwordHash: await bcrypt.hash('user123', saltRounds),
      role: 'user',
      room: 'B0805',
      phone: '0987654321',
      createdAt: new Date().toISOString(),
      householdCode: 'HH-B0805',
      householdHeadName: 'Tran Thi Binh',
      houseNo: 'B0805',
      street: 'BlueMoon Street',
      ward: 'Me Tri Ward',
      district: 'Nam Tu Liem District',
      alias: 'Jim',
      dob: '1979-01-15',
      birthPlace: 'Philadelphia',
      hometown: 'Nam Dinh',
      ethnicity: 'Kinh',
      occupation: 'Sales',
      workplace: 'Dunder Mifflin',
      identityNo: '031079000333',
      issueDate: '2017-07-15',
      issuePlace: 'Police Dept',
      previousResidence: 'Philadelphia'
    }
  ];
  writeCollection('users', users);

  // ── LOGS ───────────────────────────────────────────────────
  const logs = [
    {
      id: 'log_' + uuidv4(),
      username: 'system',
      action: 'System database initialized successfully',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      type: 'info'
    },
    {
      id: 'log_' + uuidv4(),
      username: 'admin',
      action: 'Administrator logged into the portal',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'success'
    }
  ];
  writeCollection('logs', logs);

  // ── FEES ───────────────────────────────────────────────────
  const feeId1 = uuidv4(), feeId2 = uuidv4(), feeId3 = uuidv4();
  const feeId4 = uuidv4(), feeId5 = uuidv4(), feeId6 = uuidv4();

  const fees = [
    { id: feeId1, name: 'Phí dịch vụ chung cư',  type: 'COMPULSORY', calcMethod: 'PER_AREA',    price: 7000 },
    { id: feeId2, name: 'Phí gửi xe máy',         type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 70000 },
    { id: feeId3, name: 'Tiền nước sinh hoạt',    type: 'COMPULSORY', calcMethod: 'CONSUMPTION', price: 15000 },
    { id: feeId4, name: 'Quỹ ủng hộ bão lũ',      type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 50000 },
    { id: feeId5, name: 'Phí an ninh tổ dân phố', type: 'COMPULSORY', calcMethod: 'PER_MEMBER',  price: 10000 },
    { id: feeId6, name: 'Phí gửi xe ô tô',        type: 'VOLUNTARY',  calcMethod: 'FIXED',       price: 1200000 }
  ];
  writeCollection('fees', fees);

  // ── HOUSEHOLDS ─────────────────────────────────────────────
  const households = [
    { id: 'P101', ownerName: 'Nguyen Van Hung',   membersCount: 4, area: 75.0,  motorcycleCount: 2, carCount: 1, createdAt: new Date().toISOString() },
    { id: 'P102', ownerName: 'Tran Thi Tuyet',    membersCount: 2, area: 60.0,  motorcycleCount: 1, carCount: 0, createdAt: new Date().toISOString() },
    { id: 'P201', ownerName: 'Pham Minh Tuan',    membersCount: 5, area: 110.0, motorcycleCount: 3, carCount: 1, createdAt: new Date().toISOString() },
    { id: 'P202', ownerName: 'Le Hoang Nam',       membersCount: 3, area: 85.0,  motorcycleCount: 2, carCount: 1, createdAt: new Date().toISOString() },
    { id: 'P301', ownerName: 'Hoang Duc Long',     membersCount: 1, area: 45.0,  motorcycleCount: 0, carCount: 0, createdAt: new Date().toISOString() }
  ];
  writeCollection('households', households);

  // ── COLLECTION PERIODS ─────────────────────────────────────
  const periodId = uuidv4();
  const periods = [
    {
      id: periodId,
      name: 'Đợt thu phí tháng 05/2026',
      feeIds: [feeId1, feeId2, feeId3, feeId4, feeId5, feeId6],
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
  ];
  writeCollection('periods', periods);

  // ── ASSIGNED FEES ──────────────────────────────────────────
  function calcQty(fee, hh) {
    if (fee.calcMethod === 'PER_MEMBER') return hh.membersCount;
    if (fee.calcMethod === 'PER_AREA')   return hh.area;
    return 1;
  }

  let assignedFees = [];

  for (const hh of households) {
    for (const fee of fees) {
      let shouldAssign = false;
      let qty = 1;

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

      if (shouldAssign) {
        assignedFees.push({
          id: uuidv4(),
          householdId: hh.id,
          periodId,
          feeId: fee.id,
          quantity: qty,
          status: 'UNPAID',
          paidAt: null
        });
      }
    }
  }

  // Cập nhật chỉ số nước
  const waterUpdates = [
    { hhId: 'P101', qty: 18 }, { hhId: 'P102', qty: 8 },
    { hhId: 'P201', qty: 25 }, { hhId: 'P202', qty: 12 },
    { hhId: 'P301', qty: 5  }
  ];
  waterUpdates.forEach(({ hhId, qty }) => {
    const af = assignedFees.find(a => a.householdId === hhId && a.feeId === feeId3 && a.periodId === periodId);
    if (af) af.quantity = qty;
  });

  // Thêm đóng góp quỹ bão lũ cho P101 và P201
  [{ hhId: 'P101' }, { hhId: 'P201' }].forEach(({ hhId }) => {
    if (!assignedFees.find(a => a.householdId === hhId && a.feeId === feeId4)) {
      assignedFees.push({ id: uuidv4(), householdId: hhId, periodId, feeId: feeId4, quantity: 1, status: 'UNPAID', paidAt: null });
    }
  });

  // P102 đã thanh toán phí dịch vụ + phí an ninh
  assignedFees.forEach(af => {
    if (af.householdId === 'P102' && (af.feeId === feeId1 || af.feeId === feeId5)) {
      af.status = 'PAID';
      af.paidAt = new Date().toISOString();
    }
  });

  writeCollection('assigned_fees', assignedFees);

  // ── RECEIPTS ───────────────────────────────────────────────
  const paidAfs = assignedFees.filter(af => af.status === 'PAID');
  const receipts = paidAfs.map(af => {
    const fee = fees.find(f => f.id === af.feeId);
    const hh  = households.find(h => h.id === af.householdId);
    let amount = fee.price;
    if (fee.calcMethod === 'PER_MEMBER') amount = fee.price * hh.membersCount;
    if (fee.calcMethod === 'PER_AREA')   amount = fee.price * hh.area;
    if (fee.calcMethod === 'CONSUMPTION') amount = fee.price * af.quantity;

    return {
      id: 'REC_' + uuidv4().slice(0, 8).toUpperCase(),
      assignedFeeId: af.id,
      householdId: af.householdId,
      periodId: af.periodId,
      feeId: af.feeId,
      amountRequired: amount,
      amountPaid: amount,
      paidAt: af.paidAt,
      note: 'Seed payment',
      createdBy: 'system',
      createdAt: new Date().toISOString()
    };
  });
  writeCollection('receipts', receipts);

  // ── RESIDENTS (nhân khẩu) ──────────────────────────────────
  const residents = [
    {
      id: uuidv4(),
      householdId: 'P101',
      fullName: 'Nguyen Van Hung',
      dob: '1975-03-10',
      gender: 'Male',
      relationship: 'Chủ hộ',
      identityNo: '001075001001',
      phone: '0901000101',
      occupation: 'Engineer',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      householdId: 'P101',
      fullName: 'Nguyen Thi Lan',
      dob: '1978-07-22',
      gender: 'Female',
      relationship: 'Vợ',
      identityNo: '001078001002',
      phone: '0901000102',
      occupation: 'Teacher',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      householdId: 'P102',
      fullName: 'Tran Thi Tuyet',
      dob: '1990-11-05',
      gender: 'Female',
      relationship: 'Chủ hộ',
      identityNo: '001090002001',
      phone: '0902000201',
      occupation: 'Accountant',
      createdAt: new Date().toISOString()
    }
  ];
  writeCollection('residents', residents);

  console.log('✅ Seed dữ liệu thành công!');
  console.log('   - Users: admin / admin123 | resident1 / user123 | resident2 / user123');
}

module.exports = { seedDatabase };
