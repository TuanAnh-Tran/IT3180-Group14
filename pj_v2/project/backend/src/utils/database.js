/**
 * DATABASE UTILITY — JSON File-based persistent storage
 * Mô phỏng DB với file JSON, dễ chuyển sang MongoDB/PostgreSQL sau này.
 * Mỗi "collection" = 1 file JSON trong thư mục /data
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Đọc dữ liệu từ file JSON
 * @param {string} collection - tên collection (vd: 'users', 'fees')
 * @returns {Array|Object}
 */
function readCollection(collection) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Ghi dữ liệu vào file JSON
 * @param {string} collection
 * @param {Array|Object} data
 */
function writeCollection(collection, data) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readCollection, writeCollection, DATA_DIR };
