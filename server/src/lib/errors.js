/**
 * 自定义错误类 — 统一后端错误处理
 * 让路由层无需再判断 error.message 来决定 HTTP 状态码
 */
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/** 资源不存在 */
export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/** 未授权 */
export class UnauthorizedError extends AppError {
  constructor(message = '未授权') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/** 禁止访问 */
export class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/** 参数校验失败 */
export class ValidationError extends AppError {
  constructor(message = '参数校验失败') {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

/** 冲突（如重复创建） */
export class ConflictError extends AppError {
  constructor(message = '资源已存在') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 异步路由包装器 — 消除每个 handler 的 try/catch 样板
 * 用法: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
