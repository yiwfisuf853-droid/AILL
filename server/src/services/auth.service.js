import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ConflictError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError } from '../lib/errors.js';
import { validateApiKey } from '../middleware/apikey-auth.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置，服务拒绝启动。请在 .env 中配置 JWT_SECRET。');
  process.exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;

// 用户验证中间件（支持 JWT + API Key）
export const authMiddleware = async (req, res, next) => {
  try {
    // 优先检查 X-API-Key header
    const xApiKey = req.headers['x-api-key'];
    if (xApiKey) {
      const user = await validateApiKey(xApiKey);
      if (user) { req.user = user; return next(); }
      throw new UnauthorizedError('API Key 无效或已过期');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('未授权，请先登录');
    }

    const token = authHeader.split(' ')[1];

    // API Key 通过 Bearer Token 方式传递（aill_ 前缀）
    if (token.startsWith('aill_')) {
      const user = await validateApiKey(token);
      if (user) { req.user = user; return next(); }
      throw new UnauthorizedError('API Key 无效或已过期');
    }

    // JWT 验证
    const revoked = await repo.findOne('revoked_tokens', { token });
    if (revoked) {
      throw new UnauthorizedError('Token 已失效，请重新登录');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) return next(error);
    return next(new UnauthorizedError('Token 无效或已过期'));
  }
};

// 可选认证中间件（支持 JWT + API Key，无认证也不阻止）
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // 检查 X-API-Key
    if (req.headers['x-api-key']?.startsWith('aill_')) {
      const user = await validateApiKey(req.headers['x-api-key']);
      if (user) { req.user = user; return next(); }
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // API Key
      if (token.startsWith('aill_')) {
        const user = await validateApiKey(token);
        if (user) { req.user = user; return next(); }
        return next();
      }

      // JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
  } catch {
    // token 无效时忽略，继续执行
  }
  next();
};

// 管理员验证中间件
export const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ForbiddenError('需要管理员权限');
  }
  next();
};

// 注册
export async function registerUser(username, email, password) {
  // 检查用户是否存在
  const existingUser = await repo.rawQuery(
    `SELECT id FROM users WHERE username = $1 OR email = $2`,
    [username, email]
  );
  if (existingUser.rows.length > 0) {
    throw new ConflictError('用户名或邮箱已被使用');
  }

  // 密码加密
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建用户（强制 isAi=false，AI 注册走专用流程）
  const isAi = false;
  const user = {
    id: generateId(),
    username,
    email,
    password: hashedPassword,
    avatar: null,
    bio: '',
    isAi,
    aiLikelihood: 0,
    role: 'user',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('users', user);

  // 生成 token
  const token = generateToken(user);

  return {
    token,
    refreshToken: generateRefreshToken(user),
    user: sanitizeUser(user),
  };
}

// 登录
export async function loginUser(username, password) {
  const res = await repo.rawQuery(
    `SELECT * FROM users WHERE username = $1 OR email = $1`,
    [username]
  );
  const user = res.rows.length > 0 ? repo.toCamelCase(res.rows[0]) : null;

  // 统一错误消息，防止用户名枚举（SEC-19）
  const invalidCredentialsError = new UnauthorizedError('用户名或密码错误');

  if (!user) {
    throw invalidCredentialsError;
  }

  if (user.deletedAt) {
    throw new ForbiddenError('账号已被禁用');
  }

  // 防御性检查：空密码拒绝（防止旧数据中空密码AI用户绕过认证）
  if (!user.password || user.password.trim().length === 0) {
    throw invalidCredentialsError;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw invalidCredentialsError;
  }

  // AI 用户特殊处理：检查是否有有效的平台配置
  // 只有设置了密码的 AI 用户可以登录（如 adminAi 测试账号）
  // 其他 AI 用户通过 AILL API Key 认证

  // 生成 token
  const token = generateToken(user);

  return {
    token,
    refreshToken: generateRefreshToken(user),
    user: sanitizeUser(user),
  };
}

// 获取当前用户
export async function getCurrentUser(userId) {
  const user = await repo.findById('users', userId);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  return sanitizeUser(user);
}

// 生成 Token（包含 isAi 字段，SEC-10: 缩短至 2 小时）
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, isAi: user.isAi },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

// 生成刷新 Token（SEC-10: Refresh Token 缩短至 7 天）
export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 清理用户敏感信息
function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// 刷新 Token
export async function refreshUserToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    const user = await repo.findById('users', decoded.id);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    return {
      token: generateToken(user),
      refreshToken: generateRefreshToken(user),
    };
  } catch (error) {
    throw new UnauthorizedError('Refresh token 无效或已过期');
  }
}

// 更新用户资料
export async function updateUserProfile(userId, updates) {
  const user = await repo.findById('users', userId);
  if (!user) throw new NotFoundError('用户不存在');

  const allowedFields = ['username', 'avatar', 'bio', 'email'];
  const updateData = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }
  updateData.updatedAt = new Date().toISOString();

  const updated = await repo.update('users', userId, updateData);
  return sanitizeUser(updated);
}

// 修改密码
export async function changeUserPassword(userId, oldPassword, newPassword) {
  const user = await repo.findById('users', userId);
  if (!user) throw new NotFoundError('用户不存在');

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) throw new UnauthorizedError('当前密码错误');
  if (!newPassword || newPassword.length < 6) throw new ValidationError('新密码至少 6 位');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await repo.update('users', userId, {
    password: hashedPassword,
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}
