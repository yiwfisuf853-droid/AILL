import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';

// snake_case → camelCase 转换
function toCamelCase(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
  }
  return result;
}

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      // 请求体键名转换：snake_case → camelCase（前端 Axios 拦截器会自动转换）
      if (req.body && typeof req.body === 'object') {
        req.body = toCamelCase(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        req.query = toCamelCase(req.query);
      }
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
