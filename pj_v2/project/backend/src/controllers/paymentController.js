/**
 * PAYMENT CONTROLLER — Thanh toán, biên lai, thống kê
 */

const { Receipt } = require('../models/FeeModels');

/** POST /api/payments */
function recordPayment(req, res, next) {
  try {
    const { assignedFeeId, amountPaid, note } = req.body;
    if (!assignedFeeId) return res.status(400).json({ success: false, message: 'assignedFeeId is required.' });

    const receipt = Receipt.pay(assignedFeeId, {
      amountPaid: amountPaid ? Number(amountPaid) : undefined,
      note,
      createdBy: req.user.username
    });
    res.status(201).json({ success: true, data: receipt, message: 'Payment recorded successfully!' });
  } catch (err) { next(err); }
}

/** DELETE /api/payments/:assignedFeeId */
function undoPayment(req, res, next) {
  try {
    Receipt.undo(req.params.assignedFeeId);
    res.json({ success: true, message: 'Payment undone successfully!' });
  } catch (err) { next(err); }
}

/** GET /api/payments/receipts */
function getReceipts(req, res, next) {
  try {
    const { householdId, periodId } = req.query;
    let data;
    if (householdId)  data = Receipt.findByHousehold(householdId);
    else if (periodId) data = Receipt.findByPeriod(periodId);
    else               data = Receipt.findAll();
    res.json({ success: true, data, total: data.length });
  } catch (err) { next(err); }
}

/** GET /api/payments/stats */
function getStats(req, res, next) {
  try {
    res.json({ success: true, data: Receipt.getStats() });
  } catch (err) { next(err); }
}

module.exports = { recordPayment, undoPayment, getReceipts, getStats };
