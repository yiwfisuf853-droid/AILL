import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ConflictError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError } from '../lib/errors.js';
import { decrypt } from '../lib/crypto.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置，服务拒绝启动。请在 .env 中配置 JWT_SECRET。');
  process.exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;

// 用户验证中间件（仅支持 JWT）
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('未授权，请先登录');
    }

    const token = authHeader.split(' ')[1];

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

// 可选认证中间件（仅支持 JWT）
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // JWT 验证
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
  } catch (e) {
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
    passwordHash: hashedPassword,
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

  // 初始化用户资产（与 seed 数据一致）
  try {
    const assetTypes = await repo.findAll('asset_types', { orderBy: 'id ASC' });
    for (const at of assetTypes) {
      const existing = await repo.findOne('user_assets', { userId: user.id, assetTypeId: at.id });
      if (!existing) {
        await repo.insert('user_assets', {
          id: generateId(),
          userId: user.id,
          typeId: at.id,
          assetTypeId: at.id,
          balance: 0,
          frozen: 0,
          updatedAt: new Date().toISOString(),
          expiredAt: null,
        });
      }
    }
  } catch (assetErr) {
    console.warn('[Register] Failed to initialize assets for user', user.id, ':', assetErr.message);
  }

  // 创建默认收藏夹
  try {
    await repo.insert('favorite_folders', {
      id: generateId(),
      userId: user.id,
      name: '我的收藏',
      description: '',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (folderErr) {
    console.warn('[Register] Failed to create default folder for user', user.id, ':', folderErr.message);
  }

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
  if (!user.passwordHash || user.passwordHash.trim().length === 0) {
    throw invalidCredentialsError;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
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

/**
 * AI 用户 API Key 登录
 * 用明文 API Key 与数据库中 AES 加密存储的 key 比对：
 * 1. 查找指定 platform 且 status=1 的 ai_platform_configs
 * 2. 逐个解密 apiKeyHash，与传入的 apiKey 比对
 * 3. 匹配成功则签发 JWT，自动恢复活跃循环
 */
export async function loginAiByPlatformKey(platform, apiKey, baseUrl) {
  // 查找该平台的所有活跃配置
  const configs = await repo.findAll('ai_platform_configs', {
    platform,
    status: 1,
  });

  if (!configs || configs.length === 0) {
    throw new UnauthorizedError('API Key 与已注册 AI 不匹配');
  }

  // 逐个解密比对
  let matchedConfig = null;
  let matchedUser = null;

  for (const config of configs) {
    try {
      const decryptedKey = decrypt(config.apiKeyHash);
      if (decryptedKey === apiKey) {
        // 如果是 relay 平台，还需比对 baseUrl
        if (platform === 'relay' && baseUrl) {
          if (config.apiBaseUrl !== baseUrl.replace(/\/+$/, '')) continue;
        }
        matchedConfig = config;
        matchedUser = await repo.findById('users', config.userId);
        break;
      }
    } catch (e) {
      // 解密失败跳过
      console.warn(`[AI Login] Failed to decrypt apiKeyHash for config ${config.id}:`, e.message);
      continue;
    }
  }

  if (!matchedConfig || !matchedUser) {
    throw new UnauthorizedError('API Key 与已注册 AI 不匹配');
  }

  if (matchedUser.deletedAt) {
    throw new ForbiddenError('账号已被禁用');
  }

  // 签发 JWT
  const token = generateToken(matchedUser);
  const refreshToken = generateRefreshToken(matchedUser);

  // 自动恢复活跃循环
  try {
    const { startLiveness } = await import('./ai-liveness.service.js');
    const livenessResult = await startLiveness(matchedUser.id);
    if (livenessResult?.started) {
      console.log(`[AI Login] AI ${matchedUser.username} 活跃循环已自动恢复`);
    } else {
      console.warn(`[AI Login] AI ${matchedUser.username} 活跃循环未启动: ${livenessResult?.message || '未知原因'}`);
    }
  } catch (livenessErr) {
    console.warn(`[AI Login] Failed to auto-start liveness for ${matchedUser.username}:`, livenessErr.message);
  }

  return {
    token,
    refreshToken,
    user: sanitizeUser(matchedUser),
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

// 生成 Token（SEC-10: 普通用户 2 小时，AI 用户 7 天 — AI 需要长期运行）
export function generateToken(user) {
  const expiresIn = user.isAi ? '7d' : '2h';
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, isAi: user.isAi },
    JWT_SECRET,
    { expiresIn }
  );
}

// 生成刷新 Token（SEC-10: 普通用户 7 天，AI 用户 30 天）
export function generateRefreshToken(user) {
  const expiresIn = user.isAi ? '30d' : '7d';
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn }
  );
}

// 清理用户敏感信息
function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
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

  // AI 用户使用平台 Key 认证，不支持密码修改
  if (user.isAi) {
    throw new ForbiddenError('AI 用户不支持密码修改');
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isPasswordValid) throw new UnauthorizedError('当前密码错误');
  if (!newPassword || newPassword.length < 6) throw new ValidationError('新密码至少 6 位');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await repo.update('users', userId, {
    passwordHash: hashedPassword,
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

// 停用账号（软删除）
export async function deactivateAccount(userId, password) {
  const user = await repo.findById('users', userId);
  if (!user) throw new NotFoundError('用户不存在');

  // AI 用户没有密码，不支持停用功能
  if (user.isAi) {
    throw new ForbiddenError('AI 用户不支持停用账号');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) throw new UnauthorizedError('密码错误');

  await repo.update('users', userId, {
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: '账号已停用' };
}

// 永久删除账号
export async function deleteAccount(userId, password) {
  const user = await repo.findById('users', userId);
  if (!user) throw new NotFoundError('用户不存在');

  // AI 用户没有密码，不支持删除功能
  if (user.isAi) {
    throw new ForbiddenError('AI 用户不支持删除账号');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) throw new UnauthorizedError('密码错误');

  await repo.remove('users', userId);
  await repo.rawQuery('DELETE FROM posts WHERE author_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM comments WHERE author_id = $1 OR user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM likes WHERE user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM favorites WHERE user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM user_relationships WHERE user_id = $1 OR target_user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM messages WHERE sender_id = $1 OR conversation_id IN (SELECT id FROM conversations WHERE id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = $1))', [userId]);
  await repo.rawQuery('DELETE FROM notifications WHERE user_id = $1 OR source_user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM user_settings WHERE user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM ai_profiles WHERE user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM ai_platform_configs WHERE user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM user_assets WHERE user_id = $1', [userId]);
  await repo.rawQuery('DELETE FROM favorite_folders WHERE user_id = $1', [userId]);
  return { success: true, message: '账号已永久删除' };
}

// 导出用户数据
export async function exportUserData(userId) {
  const user = await repo.findById('users', userId);
  if (!user) throw new NotFoundError('用户不存在');

  const sanitized = sanitizeUser(user);

  const [posts, comments] = await Promise.all([
    repo.findAll('posts', { where: { authorId: userId }, limit: 10000 }),
    repo.findAll('posts', { where: { userId }, limit: 10000, table: 'comments' }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: sanitized,
    posts: posts.rows || [],
    comments: comments.rows || [],
    totalPosts: posts.total || 0,
    totalComments: comments.total || 0,
  };
}
