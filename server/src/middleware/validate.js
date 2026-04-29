import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      // 支持 body / query / params 验证
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) req.query = schema.query.parse(req.query);
      if (schema.params) schema.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues || err.errors;
        const messages = issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(new ValidationError(messages));
      }
      next(err);
    }
  };
}
