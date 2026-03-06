/**
 * Module 1 — Categorizer Service (Groq)
 */

const Groq = require('groq-sdk');
const db     = require('../../db/client');
const { logAI, logger } = require('../../middleware/logger');
const { buildSystemPrompt, buildCategorizerPrompt, PRIMARY_CATEGORIES } = require('./prompt');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function stripCodeFences(text) {
  return text.replace(/```(?:json)?\n?/gi, '').trim();
}

function validateCategorizerOutput(data) {
  const errors = [];
  if (!PRIMARY_CATEGORIES.includes(data.primary_category)) {
    errors.push(`Invalid primary_category: "${data.primary_category}"`);
  }
  if (!data.sub_category || typeof data.sub_category !== 'string') {
    errors.push('Missing or invalid sub_category');
  }
  if (!Array.isArray(data.seo_tags) || data.seo_tags.length < 5 || data.seo_tags.length > 10) {
    errors.push(`seo_tags must be 5–10 items, got ${data.seo_tags?.length}`);
  }
  if (!Array.isArray(data.sustainability_filters)) {
    errors.push('sustainability_filters must be an array');
  }
  if (typeof data.confidence_score !== 'number' || data.confidence_score < 0 || data.confidence_score > 1) {
    errors.push('confidence_score must be 0–1');
  }
  return errors;
}

async function categorizeProduct(product) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt   = buildCategorizerPrompt(product);
  const model        = 'llama-3.3-70b-versatile';

  logger.info(`[categorizer] Starting categorisation for: "${product.name}"`);
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
      temperature:     0.2,
      max_tokens:      800,
      response_format: { type: 'json_object' },
    });

    rawResponse      = completion.choices[0].message.content;
    const usage      = completion.usage || {};
    const durationMs = Date.now() - startTime;

    // ── 2. Parse JSON ─────────────────────────────────────────────────────────
    const cleaned = stripCodeFences(rawResponse);
    const aiData  = JSON.parse(cleaned);

    // ── 3. Validate ───────────────────────────────────────────────────────────
    const validationErrors = validateCategorizerOutput(aiData);
    if (validationErrors.length > 0) {
      throw new Error(`AI output validation failed: ${validationErrors.join('; ')}`);
    }

    // ── 4. Persist to DB ──────────────────────────────────────────────────────
    let savedRecord = null;
    if (product.id) {
      const { rows } = await db.query(
        `INSERT INTO product_categories
           (product_id, primary_category, sub_category, seo_tags,
            sustainability_filters, confidence_score, raw_ai_output)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          product.id,
          aiData.primary_category,
          aiData.sub_category,
          aiData.seo_tags,
          aiData.sustainability_filters,
          aiData.confidence_score,
          JSON.stringify(aiData),
        ]
      );
      savedRecord = rows[0];
      logger.info(`[categorizer] Saved to DB — record id: ${savedRecord.id}`);
    }

    // ── 5. Log AI interaction ─────────────────────────────────────────────────
    await logAI({
      module:           'categorizer',
      referenceId:      product.id,
      prompt:           `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}`,
      rawResponse,
      parsedOutput:     aiData,
      model,
      promptTokens:     usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      durationMs,
      success:          true,
    });

    // ── 6. Return ─────────────────────────────────────────────────────────────
    return {
      success: true,
      product: { id: product.id, name: product.name },
      categorisation: aiData,
      meta: { model, durationMs, dbRecordId: savedRecord?.id || null },
    };

  } catch (err) {
    const durationMs = Date.now() - startTime;
    await logAI({
      module:       'categorizer',
      referenceId:  product.id,
      prompt:       userPrompt,
      rawResponse:  rawResponse || '',
      model,
      durationMs,
      success:      false,
      errorMessage: err.message,
    });
    logger.error(`[categorizer] Failed: ${err.message}`);
    throw err;
  }
}

async function categorizeAllPending() {
  const { rows: products } = await db.query(
    `SELECT p.* FROM products p
     LEFT JOIN product_categories pc ON pc.product_id = p.id
     WHERE pc.id IS NULL`
  );
  logger.info(`[categorizer] Found ${products.length} uncategorised products`);
  const results = [];
  for (const product of products) {
    try {
      const result = await categorizeProduct(product);
      results.push({ status: 'success', productId: product.id, ...result });
    } catch (err) {
      results.push({ status: 'error', productId: product.id, error: err.message });
    }
  }
  return results;
}

module.exports = { categorizeProduct, categorizeAllPending };