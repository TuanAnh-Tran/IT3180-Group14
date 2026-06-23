/**
 * LOG MODEL — Ghi nhật ký hoạt động hệ thống
 */

const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('../utils/database');

const COLLECTION = 'logs';
const MAX_LOGS = 100;

class Log {
  static getAll() {
    return readCollection(COLLECTION);
  }

  static async add(username, action, type = 'info') {
    const logs = readCollection(COLLECTION);
    const newLog = {
      id: 'log_' + uuidv4(),
      username,
      action,
      timestamp: new Date().toISOString(),
      type // 'info' | 'success' | 'warning' | 'error'
    };

    logs.unshift(newLog);
    if (logs.length > MAX_LOGS) logs.pop();
    writeCollection(COLLECTION, logs);
    return newLog;
  }
}

module.exports = Log;
