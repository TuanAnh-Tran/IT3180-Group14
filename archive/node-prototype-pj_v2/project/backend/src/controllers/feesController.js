/**
 * FEES CONTROLLER — Quản lý khoản thu, đợt thu, hộ gia đình, gán phí
 */

const { Fee, Household, Period, AssignedFee } = require('../models/FeeModels');

// ── FEES ──────────────────────────────────────────────────
const getFees    = (req, res, next) => { try { res.json({ success: true, data: Fee.findAll() }); } catch(e){next(e);} };
const createFee  = (req, res, next) => { try { res.status(201).json({ success: true, data: Fee.create(req.body) }); } catch(e){next(e);} };
const updateFee  = (req, res, next) => { try { res.json({ success: true, data: Fee.update(req.params.id, req.body) }); } catch(e){next(e);} };
const deleteFee  = (req, res, next) => { try { Fee.delete(req.params.id); res.json({ success: true, message: 'Fee deleted.' }); } catch(e){next(e);} };

// ── HOUSEHOLDS ─────────────────────────────────────────────
const getHouseholds    = (req, res, next) => { try { res.json({ success: true, data: Household.findAll() }); } catch(e){next(e);} };
const getHousehold     = (req, res, next) => {
  try {
    const hh = Household.findById(req.params.id);
    if (!hh) return res.status(404).json({ success: false, message: 'Household not found' });
    res.json({ success: true, data: hh });
  } catch(e){next(e);}
};
const createHousehold  = (req, res, next) => { try { res.status(201).json({ success: true, data: Household.create(req.body) }); } catch(e){next(e);} };
const updateHousehold  = (req, res, next) => { try { res.json({ success: true, data: Household.update(req.params.id, req.body) }); } catch(e){next(e);} };
const deleteHousehold  = (req, res, next) => { try { Household.delete(req.params.id); res.json({ success: true, message: 'Household deleted.' }); } catch(e){next(e);} };

// ── PERIODS ────────────────────────────────────────────────
const getPeriods   = (req, res, next) => { try { res.json({ success: true, data: Period.findAll() }); } catch(e){next(e);} };
const getPeriod    = (req, res, next) => {
  try {
    const p = Period.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Period not found' });
    res.json({ success: true, data: p });
  } catch(e){next(e);}
};
const createPeriod = (req, res, next) => { try { res.status(201).json({ success: true, data: Period.create(req.body) }); } catch(e){next(e);} };
const updatePeriodStatus = (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE','CLOSED'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be ACTIVE or CLOSED' });
    res.json({ success: true, data: Period.updateStatus(req.params.id, status) });
  } catch(e){next(e);}
};
const getPeriodStats = (req, res, next) => {
  try { res.json({ success: true, data: Period.getStats(req.params.id) }); } catch(e){next(e);}
};

// ── ASSIGNED FEES ──────────────────────────────────────────
const getAssignedFees = (req, res, next) => {
  try {
    const { periodId, householdId } = req.query;
    let data;
    if (periodId)     data = AssignedFee.findDetailed(periodId);
    else if (householdId) data = AssignedFee.findByHousehold(householdId);
    else              data = AssignedFee.findAll();
    res.json({ success: true, data });
  } catch(e){next(e);}
};
const upsertAssignedFee  = (req, res, next) => { try { res.json({ success: true, data: AssignedFee.upsert(req.body) }); } catch(e){next(e);} };
const deleteAssignedFee  = (req, res, next) => { try { AssignedFee.delete(req.params.id); res.json({ success: true, message: 'AssignedFee removed.' }); } catch(e){next(e);} };

module.exports = {
  getFees, createFee, updateFee, deleteFee,
  getHouseholds, getHousehold, createHousehold, updateHousehold, deleteHousehold,
  getPeriods, getPeriod, createPeriod, updatePeriodStatus, getPeriodStats,
  getAssignedFees, upsertAssignedFee, deleteAssignedFee
};
