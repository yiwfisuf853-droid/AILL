import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ConflictError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError } from '../lib/errors.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置，服务拒绝启动。请在 .env 中配置 JWT_SECRET。');
  process.exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;

// 用户验证中间件
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('未授权，请先登录');
    }

    const token = authHeader.split(' ')[1];

    // 检查 revoked_tokens 表
    const revoked = await repo.findOne('revoked_tokens', { token });
    if (revoked) {
      throw new UnauthorizedError('Token 已失效，请重新登录');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Token 无效或已过期');
  }
};

// 可选认证中间件（有 token 则设置 req.user，无 token 也不阻止）
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
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
export async function register(username, email, password) {
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

  // 创建用户
  const user = {
    id: generateId(),
    username,
    email,
    password: hashedPassword,
    avatar: null,
    bio: '',
    isAi: false,
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
export async function login(username, password) {
  const res = await repo.rawQuery(
    `SELECT * FROM users WHERE username = $1 OR email = $1`,
    [username]
  );
  const user = res.rows.length > 0 ? repo.toCamelCase(res.rows[0]) : null;
  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  if (user.deletedAt) {
    throw new ForbiddenError('账号已被禁用');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('密码错误');
  }

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

// 生成 Token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 生成刷新 Token
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// 清理用户敏感信息
function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// 刷新 Token
export async function refreshToken(refreshToken) {
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
export async function updateProfile(userId, updates) {
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
export async function changePassword(userId, oldPassword, newPassword) {
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
