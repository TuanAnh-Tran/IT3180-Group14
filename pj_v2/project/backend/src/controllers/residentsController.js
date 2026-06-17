/**
 * RESIDENTS CONTROLLER — Quản lý nhân khẩu
 */

const { Resident, Household } = require('../models/FeeModels');

/** GET /api/residents */
function getResidents(req, res, next) {
  try {
    const { householdId } = req.query;
    const data = householdId ? Resident.findByHousehold(householdId) : Resident.findAll();
    res.json({ success: true, data, total: data.length });
  } catch (err) { next(err); }
}

/** GET /api/residents/:id */
function getResident(req, res, next) {
  try {
    const r = Resident.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: 'Resident not found!' });
    res.json({ success: true, data: r });
  } catch (err) { next(err); }
}

/** POST /api/residents */
function createResident(req, res, next) {
  try {
    if (!req.body.fullName) return res.status(400).json({ success: false, message: 'fullName is required.' });
    const r = Resident.create(req.body);
    res.status(201).json({ success: true, data: r, message: 'Resident created successfully!' });
  } catch (err) { next(err); }
}

/** PUT /api/residents/:id */
function updateResident(req, res, next) {
  try {
    const r = Resident.update(req.params.id, req.body);
    res.json({ success: true, data: r, message: 'Resident updated successfully!' });
  } catch (err) { next(err); }
}

/** DELETE /api/residents/:id */
function deleteResident(req, res, next) {
  try {
    Resident.delete(req.params.id);
    res.json({ success: true, message: 'Resident deleted successfully!' });
  } catch (err) { next(err); }
}

module.exports = { getResidents, getResident, createResident, updateResident, deleteResident };
