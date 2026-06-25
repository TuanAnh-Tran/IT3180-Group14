/**
 * LOGS ROUTES
 * GET /api/logs  (admin only)
 */

const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/logsController');

router.get('/', requireAdmin, ctrl.getLogs);

module.exports = router;
