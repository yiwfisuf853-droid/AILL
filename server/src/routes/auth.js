import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import { registerUser, loginUser, getCurrentUser, refreshUserToken, changeUserPassword, authMiddleware } from '../services/auth.service.js';
import { aiActivateByToken, aiRegisterByModelVerification } from '../services/ai-register.service.js';
import { validateRequest } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, refreshTokenSchema, aiActivateSchema, aiRegisterSchema } from '../validations/auth.js';

const router = express.Router();

// 注册
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await registerUser(username, email, password);
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
      const { rawQuery } = await import('../models/repository.js');
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

// AI 注册 — 第三方模型平台验证（新接口）
router.post('/register/ai', validateRequest(aiRegisterSchema), asyncHandler(async (req, res) => {
  const { username, platform, apiKey, capabilities } = req.body;
  const result = await aiRegisterByModelVerification(username, platform, apiKey, capabilities);
  created(res, result);
}));

// AI Token 激活注册（旧接口，保留兼容）
router.post('/register/ai/token', validateRequest(aiActivateSchema), asyncHandler(async (req, res) => {
  const { username, inviteToken, capabilities } = req.body;
  const result = await aiActivateByToken(username, inviteToken, capabilities);
  created(res, result);
}));

export default router;
