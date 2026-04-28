import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { register, login, getCurrentUser, refreshToken, changePassword, authMiddleware } from '../services/auth.service.js';
import { rawQuery } from '../models/repository.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, refreshTokenSchema } from '../validations/auth.js';

const router = express.Router();

// 注册
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await register(username, email, password);
  success(res, result);
}));

// 登录
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await login(username, password);
  success(res, result);
}));

// 登出（需认证）
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      await rawQuery('INSERT INTO revoked_tokens (token, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING', [token]);
    } catch {}
  }
  success(res, { message: '登出成功' });
}));

// 修改密码
router.put('/password', authMiddleware, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const result = await changePassword(req.user.id, oldPassword, newPassword);
  success(res, result);
}));

// 刷新 Token
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken: refresh } = req.body;
  const result = await refreshToken(refresh);
  success(res, result);
}));

// 获取当前用户
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);
  success(res, user);
}));

export default router;
