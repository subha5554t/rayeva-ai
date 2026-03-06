/**
 * Module 2 — B2B Proposal Generator Service (Groq)
 */

const Groq = require('groq-sdk');
const db     = require('../../db/client');
const { logAI, logger } = require('../../middleware/logger');
const { buildProposalSystemPrompt, buildProposalPrompt } = require('./prompt');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function stripCodeFences(text) {
  return text.replace(/```(?:json)?\n?/gi, '').trim();
}

function validateProposalOutput(data, maxBudget) {
  const errors = [];
  if (!data.product_mix || !Array.isArray(data.product_mix) || data.product_mix.length < 2) {
    errors.push('product_mix must contain at least 2 products');
  }
  let recalcTotal = 0;
  (data.product_mix || []).forEach((item, i) => {
    const expected = parseFloat((item.quantity * item.unit_price).toFixed(2));
    const actual   = parseFloat(item.total_price);
    if (Math.abs(expected - actual) > 0.05) {
      errors.push(`product_mix[${i}] total_price mismatch: ${actual} ≠ ${expected}`);
    }
    recalcTotal += expected;
  });
  if (recalcTotal > maxBudget) {
    errors.push(`Total cost $${recalcTotal.toFixed(2)} exceeds budget $${maxBudget}`);
  }
  if (!data.impact_summary?.impact_statement) {
    errors.push('impact_summary.impact_statement is required');
  }
  return errors;
}

function recalculateBudget(proposalData, maxBudget) {
  const items = proposalData.product_mix || [];
  items.forEach(item => {
    item.total_price = parseFloat((item.quantity * item.unit_price).toFixed(2));
  });
  const totalAllocated = items.reduce((sum, item) => sum + item.total_price, 0);
  const remaining      = parseFloat((maxBudget - totalAllocated).toFixed(2));
  const utilisation    = parseFloat(((totalAllocated / maxBudget) * 100).toFixed(1));
  const breakdown = {};
  items.forEach(item => {
    breakdown[item.category] = parseFloat(
      ((breakdown[item.category] || 0) + item.total_price).toFixed(2)
    );
  });
  proposalData.budget_allocation = {
    total_budget:          maxBudget,
    total_allocated:       parseFloat(totalAllocated.toFixed(2)),
    remaining_budget:      remaining,
    utilisation_percent:   utilisation,
    breakdown_by_category: breakdown,
  };
  return proposalData;
}

async function generateProposal(clientRequest) {
  const systemPrompt = buildProposalSystemPrompt();
  const userPrompt   = buildProposalPrompt(clientRequest);
  const model        = 'llama-3.3-70b-versatile';

  logger.info(`[proposal] Generating for: ${clientRequest.company} | Budget: $${clientRequest.budget}`);
  const startTime = Date.now();
  let rawResponse = '';

  try {
    // ── 1. Call Groq ──────────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature:     0.4,
      max_tokens:      2000,
      response_format: { type: 'json_object' },
    });

    rawResponse      = completion.choices[0].message.content;
    const usage      = completion.usage || {};
    const durationMs = Date.now() - startTime;

    // ── 2. Parse JSON ─────────────────────────────────────────────────────────
    const cleaned    = stripCodeFences(rawResponse);
    let proposalData = JSON.parse(cleaned);

    // ── 3. Recalculate financials (never trust AI arithmetic) ─────────────────
    proposalData = recalculateBudget(proposalData, clientRequest.budget);

    // ── 4. Validate ───────────────────────────────────────────────────────────
    const validationErrors = validateProposalOutput(proposalData, clientRequest.budget);
    if (validationErrors.length > 0) {
      throw new Error(`Proposal validation failed: ${validationErrors.join('; ')}`);
    }

    // ── 5. Persist to DB ──────────────────────────────────────────────────────
    const { rows } = await db.query(
      `INSERT INTO proposals (client_id, company_name, budget, proposal_data, status)
       VALUES ($1, $2, $3, $4, 'draft') RETURNING id, created_at`,
      [clientRequest.clientId || null, clientRequest.company, clientRequest.budget, JSON.stringify(proposalData)]
    );
    const savedProposal = rows[0];
    logger.info(`[proposal] Saved to DB — id: ${savedProposal.id}`);

    // ── 6. Log AI interaction ─────────────────────────────────────────────────
    await logAI({
      module:           'proposal',
      referenceId:      savedProposal.id,
      prompt:           `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}`,
      rawResponse,
      parsedOutput:     proposalData,
      model,
      promptTokens:     usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      durationMs,
      success:          true,
    });

    return {
      success: true,
      proposal: {
        ...proposalData,
        _db: { id: savedProposal.id, createdAt: savedProposal.created_at },
      },
      meta: { model, durationMs },
    };

  } catch (err) {
    const durationMs = Date.now() - startTime;
    await logAI({
      module:       'proposal',
      prompt:       userPrompt,
      rawResponse:  rawResponse || '',
      model,
      durationMs,
      success:      false,
      errorMessage: err.message,
    });
    logger.error(`[proposal] Failed: ${err.message}`);
    throw err;
  }
}

async function getProposalById(id) {
  const { rows } = await db.query('SELECT * FROM proposals WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listProposals(limit = 20) {
  const { rows } = await db.query(
    `SELECT id, company_name, budget, status, created_at
     FROM proposals ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { generateProposal, getProposalById, listProposals };