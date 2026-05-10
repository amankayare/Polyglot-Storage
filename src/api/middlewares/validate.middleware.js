const ApiError = require('../../utils/ApiError');

/**
 * Returns an Express middleware that validates req.body against a zod schema.
 * @param {import('zod').ZodSchema} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw ApiError.badRequest('Validation failed', details);
    }

    req.body = result.data;
    next();
  };
}

module.exports = validate;
