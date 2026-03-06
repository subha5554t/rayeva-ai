/**
 * Module 2 — Proposal Routes
 * POST /api/proposals/generate    — generate a new B2B proposal
 * GET  /api/proposals             — list all proposals
 * GET  /api/proposals/:id         — get a specific proposal
 * GET  /api/proposals/logs        — view AI logs for this module
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { asyncWrap } = require('../../middleware/errorHandler');
const { generateProposal, getProposalById, listProposals } = require('./service');
const db = require('../../db/client');

const router = express.Router();

// ── POST /api/proposals/generate ──────────────────────────────────────────────
router.post(
  '/generate',
  [
    body('company').notEmpty().withMessage('Company name is required'),
    body('industry').notEmpty().withMessage('Industry is required'),
    body('budget')
      .isFloat({ min: 100 })
      .withMessage('Budget must be a number greater than 100'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('preferences').optional().isString(),
    body('clientId').optional().isUUID(),
  ],
  asyncWrap(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { company, industry, budget, quantity, preferences, clientId } = req.body;

    const result = await generateProposal({
      company,
      industry,
      budget: parseFloat(budget),
      quantity: parseInt(quantity),
      preferences: preferences || '',
      clientId,
    });

    res.status(201).json(result);
  })
);

// ── GET /api/proposals ────────────────────────────────────────────────────────
router.get(
  '/',
  asyncWrap(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const proposals = await listProposals(limit);
    res.status(200).json({ success: true, count: proposals.length, proposals });
  })
);

// ── GET /api/proposals/logs ───────────────────────────────────────────────────
router.get(
  '/logs',
  asyncWrap(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const { rows } = await db.query(
      `SELECT id, reference_id, model, prompt_tokens, completion_tokens,
              duration_ms, success, error_message, created_at
       FROM ai_logs WHERE module = 'proposal'
       ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.status(200).json({ success: true, count: rows.length, logs: rows });
  })
);

// ── GET /api/proposals/:id ────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Proposal ID must be a valid UUID')],
  asyncWrap(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const proposal = await getProposalById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    res.status(200).json({ success: true, proposal });
  })
);

module.exports = router;
