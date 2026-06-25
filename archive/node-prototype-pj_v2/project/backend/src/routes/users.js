/**
 * USERS ROUTES (Admin only)
 * GET    /api/users
 * GET    /api/users/:username
 * POST   /api/users
 * PUT    /api/users/:username
 * DELETE /api/users/:username
 * PATCH  /api/users/:username/role
 * PATCH  /api/users/:username/reset-password
 */

const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/usersController');

router.get('/',                          requireAdmin, ctrl.getUsers);
router.get('/:username',                 requireAdmin, ctrl.getUser);
router.post('/',                         requireAdmin, ctrl.createUser);
router.put('/:username',                 requireAdmin, ctrl.updateUser);
router.delete('/:username',              requireAdmin, ctrl.deleteUser);
router.patch('/:username/role',          requireAdmin, ctrl.updateRole);
router.patch('/:username/reset-password',requireAdmin, ctrl.resetPassword);

module.exports = router;
