/**
 * AUTH CONTROLLER — Đăng nhập, đăng ký, đổi mật khẩu, profile
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Log  = require('../models/Log');

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullname: user.fullname, room: user.room, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/** POST /api/auth/login */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Please fill in both username and password!' });

    const user = await User.verifyPassword(username.trim().toLowerCase(), password);
    if (!user)
      return res.status(401).json({ success: false, message: 'Incorrect username or password!' });

    const token = signToken(user);
    await Log.add(user.username, 'Logged in successfully', 'success');

    res.json({ success: true, token, user });
  } catch (err) { next(err); }
}

/** POST /api/auth/register */
async function register(req, res, next) {
  try {
    const { username, password, role, ...rest } = req.body;

    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required!' });
    if (username.length < 4)
      return res.status(400).json({ success: false, message: 'Username must be at least 4 characters!' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters!' });

    // Kiểm tra admin secret nếu đăng ký role admin
    if (role === 'admin') {
      const { adminSecretKey } = req.body;
      if (!adminSecretKey || adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ success: false, message: 'Invalid Admin Secret Key!' });
      }
    }

    const newUser = await User.create({ username, password, role: role || 'user', ...rest }, username);
    const token   = signToken(newUser);

    res.status(201).json({ success: true, token, user: newUser });
  } catch (err) { next(err); }
}

/** GET /api/auth/me */
function getMe(req, res) {
  res.json({ success: true, user: req.user });
}

/** PUT /api/auth/change-password */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both old and new password are required!' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters!' });
    if (oldPassword === newPassword)
      return res.status(400).json({ success: false, message: 'New password cannot be same as old password!' });

    // Verify old password
    const user = await User.verifyPassword(req.user.username, oldPassword);
    if (!user)
      return res.status(401).json({ success: false, message: 'Current password is incorrect!' });

    await User.changePassword(req.user.username, newPassword, req.user.username);
    res.json({ success: true, message: 'Password changed successfully!' });
  } catch (err) { next(err); }
}

/** PUT /api/auth/profile */
async function updateProfile(req, res, next) {
  try {
    const updated = await User.updateProfile(req.user.username, req.body, req.user.username);
    const token   = signToken(updated);
    res.json({ success: true, user: updated, token });
  } catch (err) { next(err); }
}

module.exports = { login, register, getMe, changePassword, updateProfile };
