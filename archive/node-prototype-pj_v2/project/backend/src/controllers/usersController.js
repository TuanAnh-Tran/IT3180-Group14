/**
 * USERS CONTROLLER — Admin quản lý tài khoản
 */

const User = require('../models/User');

/** GET /api/users */
function getUsers(req, res, next) {
  try {
    const users = User.findAll();
    res.json({ success: true, data: users, total: users.length });
  } catch (err) { next(err); }
}

/** GET /api/users/:username */
function getUser(req, res, next) {
  try {
    const user = User.findByUsername(req.params.username);
    if (!user) return res.status(404).json({ success: false, message: 'User not found!' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

/** POST /api/users */
async function createUser(req, res, next) {
  try {
    const newUser = await User.create(req.body, req.user.username);
    res.status(201).json({ success: true, data: newUser, message: 'User created successfully!' });
  } catch (err) { next(err); }
}

/** DELETE /api/users/:username */
async function deleteUser(req, res, next) {
  try {
    await User.delete(req.params.username, req.user.username);
    res.json({ success: true, message: `User @${req.params.username} deleted successfully.` });
  } catch (err) { next(err); }
}

/** PATCH /api/users/:username/role */
async function updateRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'user'].includes(role))
      return res.status(400).json({ success: false, message: 'Role must be "admin" or "user".' });
    const updated = await User.updateRole(req.params.username, role, req.user.username);
    res.json({ success: true, data: updated, message: 'Role updated successfully!' });
  } catch (err) { next(err); }
}

/** PUT /api/users/:username */
async function updateUser(req, res, next) {
  try {
    const updated = await User.updateProfile(req.params.username, req.body, req.user.username);
    res.json({ success: true, data: updated, message: 'User updated successfully!' });
  } catch (err) { next(err); }
}

/** PATCH /api/users/:username/reset-password */
async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters!' });
    await User.changePassword(req.params.username, newPassword, req.user.username);
    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) { next(err); }
}

module.exports = { getUsers, getUser, createUser, deleteUser, updateRole, updateUser, resetPassword };
