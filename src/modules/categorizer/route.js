/**
 * Module 1 — Categorizer Routes
 * POST /api/categorizer/product      — categorise a single product
 * POST /api/categorizer/product/:id  — categorise a product already in DB
 * POST /api/categorizer/batch        — categorise all pending products
 * GET  /api/categorizer/logs         — view recent AI logs for this module
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { asyncWrap } = require('../../middleware/errorHandler');
const { categorizeProduct, categorizeAllPending } = require('./service');
const db = require('../../db/client');

const router = express.Router();

// ── POST /api/categorizer/product ─────────────────────────────────────────────
// Categorise a product supplied directly in the request body (no DB record needed)
router.post(
  '/product',
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('description').isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
  ],
  asyncWrap(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, id } = req.body;
    const result = await categorizeProduct({ id, name, description });
    res.status(200).json(result);
  })
);

// ── POST /api/categorizer/product/:id ────────────────────────────────────────
// Categorise a product that already exists in the products table
router.post(
  '/product/:id',
  [param('id').isUUID().withMessage('Product ID must be a valid UUID')],
  asyncWrap(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const result = await categorizeProduct(rows[0]);
    res.status(200).json(result);
  })
);

// ── POST /api/categorizer/batch ───────────────────────────────────────────────
// Categorise all products that don't yet have a category record
router.post(
  '/batch',
  asyncWrap(async (req, res) => {
    const results = await categorizeAllPending();
    const succeeded = results.filter(r => r.status === 'success').length;
    const failed    = results.filter(r => r.status === 'error').length;

    res.status(200).json({
      success: true,
      summary: { total: results.length, succeeded, failed },
      results,
    });
  })
);

// ── GET /api/categorizer/logs ─────────────────────────────────────────────────
// Retrieve recent AI logs for this module (useful for demo/audit)
router.get(
  '/logs',
  asyncWrap(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const { rows } = await db.query(
      `SELECT id, reference_id, model, prompt_tokens, completion_tokens,
              duration_ms, success, error_message, created_at
       FROM ai_logs
       WHERE module = 'categorizer'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.status(200).json({ success: true, count: rows.length, logs: rows });
  })
);

module.exports = router;
