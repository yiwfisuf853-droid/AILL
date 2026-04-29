import express from 'express';
import { asyncHandler, ConflictError, ValidationError } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import { registerUser, loginUser, getCurrentUser, refreshUserToken, changeUserPassword, authMiddleware } from '../services/auth.service.js';
import { rawQuery } from '../models/repository.js';
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { createApiKey } from '../services/ai.service.js';
import { validateRequest } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, refreshTokenSchema, aiActivateSchema } from '../validations/auth.js';

const router = express.Router();

// 注册
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password, isAi } = req.body;
  const result = await registerUser(username, email, password, isAi);
  success(res, result);
}));

// 登录
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await loginUser(username, password);
  success(res, result);
}));

// 登出（需认证）
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      await rawQuery('INSERT INTO revoked_tokens (token, revoked_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING', [token]);
    } catch {}
  }
  success(res, { message: '登出成功' });
}));

// 修改密码
router.put('/password', authMiddleware, validateRequest(changePasswordSchema), asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const result = await changeUserPassword(req.user.id, oldPassword, newPassword);
  success(res, result);
}));

// 刷新 Token
router.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken: refresh } = req.body;
  const result = await refreshUserToken(refresh);
  success(res, result);
}));

// 获取当前用户
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);
  success(res, user);
}));

// AI Token 激活注册（无需密码/邮箱）
router.post('/register/ai', validateRequest(aiActivateSchema), asyncHandler(async (req, res) => {
  const { username, inviteToken, capabilities } = req.body;

  // 验证邀请 Token
  const configKey = `ai_invite_${inviteToken}`;
  const tokenResult = await repo.rawQuery('SELECT * FROM sys_config WHERE config_key = $1', [configKey]);
  if (tokenResult.rows.length === 0) {
    throw new ValidationError('邀请 Token 无效');
  }
  const tokenRecord = tokenResult.rows[0];

  let tokenData;
  try {
    tokenData = JSON.parse(tokenRecord.config_value || '{}');
  } catch {
    throw new ValidationError('邀请 Token 数据异常');
  }
  if (tokenData.used) {
    throw new ValidationError('邀请 Token 已被使用');
  }

  // 检查用户名
  const existing = await rawQuery('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    throw new ConflictError('用户名已存在');
  }

  // 创建 AI 用户
  const user = {
    id: generateId(),
    username,
    email: `${username}@ai.aill.local`,
    password: '',
    avatar: null,
    bio: 'AI 创作者',
    isAi: true,
    aiLikelihood: 1.0,
    role: 'user',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('users', user);

  // 创建 AI 档案
  await repo.insert('ai_profiles', {
    id: generateId(),
    userId: user.id,
    capabilities: JSON.stringify(capabilities),
    updatedAt: new Date().toISOString(),
  });

  // 生成 API Key
  const keyResult = await createApiKey(user.id);

  // 标记 Token 已使用
  await repo.rawQuery(
    'UPDATE sys_config SET config_value = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify({ ...tokenData, used: true, usedBy: user.id, usedAt: new Date().toISOString() }), tokenRecord.id]
  );

  created(res, {
    user: { id: user.id, username: user.username, isAi: true },
    apiKey: keyResult.apiKey,
  });
}));

export default router;
