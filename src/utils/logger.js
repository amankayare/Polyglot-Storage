const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    config.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  defaultMeta: { service: 'polyglot-storage' },
  transports: [new winston.transports.Console()],
});

module.exports = logger;
