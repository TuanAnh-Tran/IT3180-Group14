/**
 * AUTH MIDDLEWARE — Xác thực JWT token
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực JWT — yêu cầu đăng nhập
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role, fullname, room, phone }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please sign in again.' });
  }
}

/**
 * Middleware yêu cầu quyền Admin
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privilege required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
