/**
 * SERVER.JS — Entry point cho Cyberspace + BlueMoon Backend API
 *
 * Architecture:
 *   Express.js REST API
 *   JSON file-based database (data/*.json)
 *   JWT Authentication
 *
 * Endpoints:
 *   POST   /api/auth/login
 *   POST   /api/auth/register
 *   GET    /api/auth/me
 *   PUT    /api/auth/change-password
 *   PUT    /api/auth/profile
 *   GET    /api/users            (admin)
 *   POST   /api/users            (admin)
 *   PUT    /api/users/:username  (admin)
 *   DELETE /api/users/:username  (admin)
 *   PATCH  /api/users/:username/role          (admin)
 *   PATCH  /api/users/:username/reset-password (admin)
 *   GET    /api/fees/fees
 *   POST   /api/fees/fees        (admin)
 *   ...    (xem src/routes/*.js)
 *   GET    /api/logs             (admin)
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const { seedDatabase }   = require('./utils/seed');
const { errorHandler }   = require('./middleware/errorHandler');

const authRoutes      = require('./routes/auth');
const usersRoutes     = require('./routes/users');
const feesRoutes      = require('./routes/fees');
const paymentsRoutes  = require('./routes/payments');
const residentsRoutes = require('./routes/residents');
const logsRoutes      = require('./routes/logs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Cyberspace + BlueMoon API is running!', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/fees',      feesRoutes);
app.use('/api/payments',  paymentsRoutes);
app.use('/api/residents', residentsRoutes);
app.use('/api/logs',      logsRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────
async function startServer() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log('');
    console.log('🏢  Cyberspace + BlueMoon Backend API');
    console.log(`✅  Server running at: http://localhost:${PORT}`);
    console.log(`📋  Health check:      http://localhost:${PORT}/api/health`);
    console.log(`🔑  Demo accounts:     admin/admin123  |  resident1/user123`);
    console.log('');
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
