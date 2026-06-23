/**
 * LOGS CONTROLLER — Nhật ký hệ thống
 */

const Log = require('../models/Log');

/** GET /api/logs */
function getLogs(req, res, next) {
  try {
    const logs = Log.getAll();
    res.json({ success: true, data: logs, total: logs.length });
  } catch (err) { next(err); }
}

module.exports = { getLogs };
