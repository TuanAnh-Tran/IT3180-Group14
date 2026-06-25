/**
 * AUTH ROUTES
 * POST   /api/auth/login
 * POST   /api/auth/register
 * GET    /api/auth/me
 * PUT    /api/auth/change-password
 * PUT    /api/auth/profile
 */

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login',           ctrl.login);
router.post('/register',        ctrl.register);
router.get('/me',               requireAuth, ctrl.getMe);
router.put('/change-password',  requireAuth, ctrl.changePassword);
router.put('/profile',          requireAuth, ctrl.updateProfile);

module.exports = router;
