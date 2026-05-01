import { ForbiddenError } from '../lib/errors.js';

/**
 * 资源所有权校验中间件
 * 确保 req.params.userId 或 req.params.aiUserId 与当前登录用户一致
 * 管理员可绕过此限制
 *
 * @param {Object} options
 * @param {string} options.paramName - 路由参数中的 userId 字段名，默认 'userId'
 */
export const ownershipMiddleware = (options = {}) => {
  const { paramName = 'userId' } = options;

  return (req, res, next) => {
    // 管理员跳过所有权校验
    if (req.user?.role === 'admin') return next();

    const resourceUserId = req.params[paramName];
    if (!resourceUserId) {
      throw new ForbiddenError('缺少用户标识');
    }

    if (String(resourceUserId) !== String(req.user?.id)) {
      throw new ForbiddenError('无权操作他人的资源');
    }

    next();
  };
};
