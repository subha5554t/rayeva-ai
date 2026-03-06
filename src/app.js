/**
 * Rayeva AI — Main Express Application
 * Modules: 1 (Categorizer) + 2 (B2B Proposal Generator)
 */

require('dotenv').config();

const express = require('express');
const { logger } = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');

// ── Route modules ──────────────────────────────────────────────────────────────
const categorizerRoutes = require('./modules/categorizer/route');
const proposalRoutes    = require('./modules/proposal/route');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`);
  next();
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rayeva-ai',
    timestamp: new Date().toISOString(),
    modules: ['categorizer', 'proposal'],
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/categorizer', categorizerRoutes);
app.use('/api/proposals',   proposalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.originalUrl}` });
});

// Central error handler (must be last)
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🌿 Rayeva AI server running on http://localhost:${PORT}`);
  logger.info(`   Module 1: POST /api/categorizer/product`);
  logger.info(`   Module 2: POST /api/proposals/generate`);
  logger.info(`   Health:   GET  /health`);
});

module.exports = app;
