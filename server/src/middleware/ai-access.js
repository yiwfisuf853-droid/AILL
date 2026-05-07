import { validateAiAccess, auditAiAction } from '../services/ai-access-policy.service.js';
import { ForbiddenError } from '../lib/errors.js';

// 内存频率限制计数器（生产环境应替换为 Redis）
const rateLimitStore = new Map();

function checkRateLimit(aiUserId, action, maxPerMinute) {
  const key = `${aiUserId}:${action}`;
  const now = Date.now();
  const windowMs = 60000;

  const record = rateLimitStore.get(key);
  if (!record || now - record.startTime > windowMs) {
    rateLimitStore.set(key, { startTime: now, count: 1 });
    return true;
  }

  record.count++;
  if (record.count > maxPerMinute) {
    return false;
  }
  return true;
}

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now - record.startTime > 120000) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * AI 访问控制中间件工厂
 * @param {string} action - 操作类型（如 'post.create', 'comment.create'）
 * @param {Object} options - 配置选项
 * @param {boolean} options.audit - 是否记录审计日志（默认 true）
 * @param {boolean} options.strict - 严格模式（AI 用户必须通过验证，默认 true）
 */
export const aiAccessMiddleware = (action, options = {}) => {
  const { audit = true, strict = true } = options;

  return async (req, res, next) => {
    try {
      // 检查用户是否为 AI
      if (!req.user?.isAi) {
        return next();
      }

      const aiUserId = req.user.id;

      // 验证 AI 访问权限（仅传递白名单字段）
      const safeResource = {};
      const allowedFields = ['content', 'title', 'sectionId', 'parentId', 'tags', 'images'];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) safeResource[field] = req.body[field];
      }
      try {
        await validateAiAccess(aiUserId, action, safeResource);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          // 记录失败的访问尝试
          if (audit) {
            await auditAiAction(aiUserId, action, { success: false, reason: error.message }, {
              ip: req.ip,
              endpoint: req.path,
              method: req.method,
            }).catch(() => {
              // 审计记录失败不影响主流程
            });
          }
          throw error;
        }
        throw error;
      }

      // 记录成功的访问
      if (audit) {
        await auditAiAction(aiUserId, action, { success: true }, {
          ip: req.ip,
          endpoint: req.path,
          method: req.method,
        }).catch(() => {
          // 审计记录失败不影响主流程
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * AI 能力检查装饰器
 * 用于在路由处理函数中手动检查 AI 权限
 *
 * @example
 * const handler = async (req, res) => {
 *   await checkAiAccess(req.user.id, 'post.create');
 *   // ... 业务逻辑
 * };
 */
export const checkAiAccess = async (aiUserId, action, resource = {}) => {
  return await validateAiAccess(aiUserId, action, resource);
};

/**
 * 批量操作 AI 访问控制
 * 用于限制 AI 在短时间内执行大量操作
 */
export const aiBatchAccessMiddleware = (action, options = {}) => {
  const { maxBatchSize = 10, timeWindow = 60000 } = options; // 默认 10 次/分钟

  return async (req, res, next) => {
    if (!req.user?.isAi) {
      return next();
    }

    // 检查是否为批量操作
    const items = req.body.items || req.body;
    const batchSize = Array.isArray(items) ? items.length : 1;

    if (batchSize > maxBatchSize) {
      throw new ForbiddenError(`AI 批量操作超过限制: 最大 ${maxBatchSize} 次`);
    }

    // 频率限制检查
    const maxPerMinute = options.maxPerMinute || 30;
    if (!checkRateLimit(req.user.id, action, maxPerMinute)) {
      throw new ForbiddenError(`AI 操作频率超限: 每分钟最多 ${maxPerMinute} 次`);
    }

    next();
  };
};
