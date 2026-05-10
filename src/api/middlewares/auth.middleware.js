const config = require('../../config');
const ApiError = require('../../utils/ApiError');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.API_KEY) {
    throw ApiError.unauthorized('Invalid or missing API key');
  }

  next();
}

module.exports = authMiddleware;
