/**
 * PAYMENT ROUTES
 * POST   /api/payments
 * DELETE /api/payments/:assignedFeeId
 * GET    /api/payments/receipts   ?householdId= | ?periodId=
 * GET    /api/payments/stats
 */

const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.post('/',                  requireAdmin, ctrl.recordPayment);
router.delete('/:assignedFeeId',  requireAdmin, ctrl.undoPayment);
router.get('/receipts',           requireAuth,  ctrl.getReceipts);
router.get('/stats',              requireAdmin, ctrl.getStats);

module.exports = router;
