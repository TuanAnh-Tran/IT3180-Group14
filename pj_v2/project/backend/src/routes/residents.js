/**
 * RESIDENTS ROUTES
 * GET    /api/residents    ?householdId=
 * GET    /api/residents/:id
 * POST   /api/residents
 * PUT    /api/residents/:id
 * DELETE /api/residents/:id
 */

const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/residentsController');

router.get('/',       requireAuth,  ctrl.getResidents);
router.get('/:id',    requireAuth,  ctrl.getResident);
router.post('/',      requireAdmin, ctrl.createResident);
router.put('/:id',    requireAdmin, ctrl.updateResident);
router.delete('/:id', requireAdmin, ctrl.deleteResident);

module.exports = router;
