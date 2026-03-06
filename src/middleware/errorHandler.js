const { logger } = require('./logger');

/**
 * Centralised Express error handler.
 * Must be registered LAST with app.use().
 */
function errorHandler(err, req, res, next) {
  logger.error(`${err.message} — ${req.method} ${req.originalUrl}`);

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * Wrap async route handlers so errors bubble up to errorHandler.
 */
function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncWrap };
