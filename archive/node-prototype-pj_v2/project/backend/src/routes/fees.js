/**
 * FEES ROUTES
 *
 * Fees:
 *   GET    /api/fees/fees
 *   POST   /api/fees/fees          (admin)
 *   PUT    /api/fees/fees/:id      (admin)
 *   DELETE /api/fees/fees/:id      (admin)
 *
 * Households:
 *   GET    /api/fees/households
 *   GET    /api/fees/households/:id
 *   POST   /api/fees/households    (admin)
 *   PUT    /api/fees/households/:id (admin)
 *   DELETE /api/fees/households/:id (admin)
 *
 * Periods:
 *   GET    /api/fees/periods
 *   GET    /api/fees/periods/:id
 *   POST   /api/fees/periods       (admin)
 *   PATCH  /api/fees/periods/:id/status (admin)
 *   GET    /api/fees/periods/:id/stats
 *
 * AssignedFees:
 *   GET    /api/fees/assigned       ?periodId= | ?householdId=
 *   POST   /api/fees/assigned       (admin)
 *   DELETE /api/fees/assigned/:id   (admin)
 */

const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/feesController');

// Fees
router.get('/fees',              requireAuth,  ctrl.getFees);
router.post('/fees',             requireAdmin, ctrl.createFee);
router.put('/fees/:id',          requireAdmin, ctrl.updateFee);
router.delete('/fees/:id',       requireAdmin, ctrl.deleteFee);

// Households
router.get('/households',        requireAuth,  ctrl.getHouseholds);
router.get('/households/:id',    requireAuth,  ctrl.getHousehold);
router.post('/households',       requireAdmin, ctrl.createHousehold);
router.put('/households/:id',    requireAdmin, ctrl.updateHousehold);
router.delete('/households/:id', requireAdmin, ctrl.deleteHousehold);

// Periods
router.get('/periods',              requireAuth,  ctrl.getPeriods);
router.get('/periods/:id',          requireAuth,  ctrl.getPeriod);
router.post('/periods',             requireAdmin, ctrl.createPeriod);
router.patch('/periods/:id/status', requireAdmin, ctrl.updatePeriodStatus);
router.get('/periods/:id/stats',    requireAuth,  ctrl.getPeriodStats);

// AssignedFees
router.get('/assigned',          requireAuth,  ctrl.getAssignedFees);
router.post('/assigned',         requireAdmin, ctrl.upsertAssignedFee);
router.delete('/assigned/:id',   requireAdmin, ctrl.deleteAssignedFee);

module.exports = router;
