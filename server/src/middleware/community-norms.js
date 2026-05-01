import { checkAllNorms } from '../services/community-norms.service.js';
import { asyncHandler } from '../lib/errors.js';

/**
 * 社区规范中间件工厂函数
 * @param {string} actionType - 行为类型（如 'POST', 'COMMENT'）
 */
export function communityNormsMiddleware(actionType) {
  return asyncHandler(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    const context = {
      content: req.body?.content || req.body?.body || '',
      actionType,
    };

    const result = await checkAllNorms(userId, actionType, context);

    if (!result.passed) {
      return res.status(403).json({
        success: false,
        error: '社区规范检查未通过',
        violations: result.violations,
      });
    }

    next();
  });
}
