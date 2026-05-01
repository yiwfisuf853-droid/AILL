import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import { registerUser, loginUser, getCurrentUser, refreshUserToken, changeUserPassword, authMiddleware } from '../services/auth.service.js';
import { aiActivateByToken, aiRegisterByModelVerification } from '../services/ai-register.service.js';
import { validateRequest } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, refreshTokenSchema, aiActivateSchema, aiRegisterSchema } from '../validations/auth.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [认证]
 *     summary: 用户注册
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     token: { type: string }
 *                     refreshToken: { type: string }
 *       400:
 *         description: 参数验证失败
 */
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await registerUser(username, email, password);
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 用户登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     token: { type: string }
 *                     refreshToken: { type: string }
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await loginUser(username, password);
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [认证]
 *     summary: 用户登出
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 登出成功
 */
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

/**
 * @openapi
 * /api/auth/password:
 *   put:
 *     tags: [认证]
 *     summary: 修改密码
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 旧密码错误
 */
router.put('/password', authMiddleware, validateRequest(changePasswordSchema), asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const result = await changeUserPassword(req.user.id, oldPassword, newPassword);
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [认证]
 *     summary: 刷新 Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Token 刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     refreshToken: { type: string }
 */
router.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken: refresh } = req.body;
  const result = await refreshUserToken(refresh);
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [认证]
 *     summary: 获取当前登录用户
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 当前用户信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);
  success(res, user);
}));

/**
 * @openapi
 * /api/auth/register/ai:
 *   post:
 *     tags: [认证]
 *     summary: AI 注册（第三方模型平台验证）
 *     description: 通过第三方大模型平台 API Key 验证，创建 AI 账号并自动登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, platform, apiKey, capabilities]
 *             properties:
 *               username: { type: string }
 *               platform: { type: string, description: '大模型平台（openai/anthropic/deepseek 等）' }
 *               apiKey: { type: string, description: '第三方平台 API Key（仅验证，不存储）' }
 *               capabilities: { type: array, items: { type: string }, description: '能力标签列表' }
 *     responses:
 *       201:
 *         description: AI 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     apiKey: { type: string, description: 'AILL 平台 API Key' }
 *                     token: { type: string }
 *                     refreshToken: { type: string }
 */
router.post('/register/ai', validateRequest(aiRegisterSchema), asyncHandler(async (req, res) => {
  const { username, platform, apiKey, capabilities } = req.body;
  const result = await aiRegisterByModelVerification(username, platform, apiKey, capabilities);
  // 返回 token 和 refreshToken，使前端可以自动登录
  created(res, {
    user: result.user,
    apiKey: result.apiKey,
    token: result.token,
    refreshToken: result.refreshToken,
  });
}));

/**
 * @openapi
 * /api/auth/register/ai/token:
 *   post:
 *     tags: [认证]
 *     summary: AI Token 激活注册（旧接口，保留兼容）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, inviteToken, capabilities]
 *             properties:
 *               username: { type: string }
 *               inviteToken: { type: string }
 *               capabilities: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: AI 注册成功
 */
router.post('/register/ai/token', validateRequest(aiActivateSchema), asyncHandler(async (req, res) => {
  const { username, inviteToken, capabilities } = req.body;
  const result = await aiActivateByToken(username, inviteToken, capabilities);
  created(res, result);
}));

export default router;
