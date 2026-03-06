const winston = require('winston');
const db      = require('../db/client');

// ─── Console / file logger ────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level}]: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ─── AI audit log (persisted to DB) ──────────────────────────────────────────
/**
 * @param {object} opts
 * @param {string} opts.module          - e.g. 'categorizer' | 'proposal'
 * @param {string} [opts.referenceId]   - product_id / proposal_id
 * @param {string} opts.prompt          - full prompt sent to OpenAI
 * @param {string} opts.rawResponse     - raw string response from OpenAI
 * @param {object} [opts.parsedOutput]  - parsed JSON output (if successful)
 * @param {string} [opts.model]         - model name used
 * @param {number} [opts.promptTokens]
 * @param {number} [opts.completionTokens]
 * @param {number} [opts.durationMs]
 * @param {boolean} [opts.success]
 * @param {string} [opts.errorMessage]
 */
async function logAI(opts) {
  const {
    module, referenceId, prompt, rawResponse, parsedOutput,
    model, promptTokens, completionTokens, durationMs,
    success = true, errorMessage = null,
  } = opts;

  try {
    await db.query(
      `INSERT INTO ai_logs
        (module, reference_id, prompt, raw_response, parsed_output,
         model, prompt_tokens, completion_tokens, duration_ms, success, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        module, referenceId || null, prompt, rawResponse,
        parsedOutput ? JSON.stringify(parsedOutput) : null,
        model || null, promptTokens || null, completionTokens || null,
        durationMs || null, success, errorMessage,
      ]
    );
  } catch (dbErr) {
    // Never let logging failures crash the main flow
    logger.error(`AI log DB write failed: ${dbErr.message}`);
  }
}

module.exports = { logger, logAI };
