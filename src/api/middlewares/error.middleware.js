const logger = require('../../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, { stack: err.stack });
  } else {
    logger.warn(`${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      message,
      ...(err.details && { details: err.details }),
    },
  });
}

module.exports = errorMiddleware;
