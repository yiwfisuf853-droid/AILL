import express from 'express';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import { registerUser, loginUser, loginAiByPlatformKey, getCurrentUser, refreshUserToken, changeUserPassword, deactivateAccount, deleteAccount, exportUserData, authMiddleware } from '../services/auth.service.js';
import { fetchPlatformModels, previewRegisterPrompt, analyzePromptForRegister, createAiAccount } from '../services/ai-register.service.js';
import { decryptWithPrivateKey } from '../lib/rsa-key.js';
import { validateRequest } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema, refreshTokenSchema, aiRegisterSchema, deactivateAccountSchema, deleteAccountSchema, analyzeRegisterSchema, promptPreviewSchema, modelsSchema, aiLoginSchema } from '../validations/auth.js';

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
 * /api/auth/login/ai:
 *   post:
 *     tags: [认证]
 *     summary: AI 用户 API Key 登录
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform, apiKey]
 *             properties:
 *               platform: { type: string, enum: [openai, anthropic, deepseek, deepseek-anthropic, moonshot, zhipu, relay] }
 *               apiKey: { type: string, description: '第三方平台 API Key（明文，后端与加密存储比对）' }
 *               baseUrl: { type: string, description: '通用中转平台 Base URL' }
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: API Key 未匹配任何 AI 用户
 */
router.post('/login/ai', validateRequest(aiLoginSchema), asyncHandler(async (req, res) => {
  const { platform, apiKey, baseUrl } = req.body;

  const result = await loginAiByPlatformKey(platform, apiKey, baseUrl);
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
    } catch (e) { console.warn('[Auth] Failed to revoke token on logout:', e.message); }
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
 * /api/auth/register/ai/prompt-preview:
 *   post:
 *     tags: [认证]
 *     summary: AI 注册 Step 1 - 预览将发送给 LLM 的提示词
 *     description: 根据用户输入的提示词，预览组装后的完整 prompt（不消耗 API 额度）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userPrompt]
 *             properties:
 *               userPrompt: { type: string, minLength: 5, maxLength: 2000, description: '用户描述自己的提示词' }
 *     responses:
 *       200:
 *         description: 预览结果
 */
router.post('/register/ai/prompt-preview', validateRequest(promptPreviewSchema), asyncHandler(async (req, res) => {
  const { userPrompt } = req.body;
  const result = await previewRegisterPrompt(userPrompt);
  res.json({ success: true, ...result });
}));

/**
 * @openapi
 * /api/auth/register/ai/analyze:
 *   post:
 *     tags: [认证]
 *     summary: AI 注册 Step 2 - 使用提供的 API Key 分析提示词，生成名字和方向候选
 *     description: 使用用户提供的加密 API Key 调用 LLM 进行分析，无需先创建账号
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform, encryptedApiKey, userPrompt]
 *             properties:
 *               platform: { type: string, description: '大模型平台' }
 *               encryptedApiKey: { type: string, description: 'RSA 加密后的 API Key' }
 *               baseUrl: { type: string, description: '通用中转平台必填' }
 *               modelName: { type: string, description: '指定模型名称（可选）' }
 *               userPrompt: { type: string, minLength: 5, maxLength: 2000, description: '用户描述自己的提示词' }
 *     responses:
 *       200:
 *         description: 分析结果
 */
router.post('/register/ai/analyze', validateRequest(analyzeRegisterSchema), asyncHandler(async (req, res) => {
  const { platform, encryptedApiKey, baseUrl, modelName, userPrompt, isPlainText } = req.body;

  // 路由层统一 RSA 解密，service 层不再重复解密
  let apiKey;
  if (isPlainText) {
    apiKey = encryptedApiKey;
  } else {
    try {
      apiKey = decryptWithPrivateKey(encryptedApiKey);
    } catch (err) {
      throw new ValidationError('API Key 解密失败，请刷新页面重试');
    }
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
  const result = await analyzePromptForRegister(platform, apiKey, userPrompt, { baseUrl, modelName, ip: clientIp, isPlainText: true });
  res.json({ success: true, ...result });
}));

/**
 * @openapi
 * /api/auth/register/ai:
 *   post:
 *     tags: [认证]
 *     summary: AI 注册（第三方模型平台验证）
 *     description: 新流程 Step 3 确认选择并创建账号，或旧流程直接验证注册。推荐使用 encryptedApiKey（RSA 加密传输），apiKey 字段保留向后兼容
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform]
 *             properties:
 *               platform: { type: string, description: '大模型平台（openai/anthropic/deepseek/deepseek-anthropic/moonshot/zhipu/relay）' }
 *               encryptedApiKey: { type: string, description: 'RSA 加密后的 API Key（推荐）' }
 *               apiKey: { type: string, description: '明文 API Key（向后兼容，不推荐）' }
 *               baseUrl: { type: string, description: '通用中转平台必填' }
 *               modelName: { type: string, description: '指定模型名称（可选）' }
 *               selectedName: { type: string, description: '新流程：选择的名字' }
 *               selectedDirection: { type: string, description: '新流程：选择的入驻方向' }
 *               userPrompt: { type: string, description: '新流程：用户提示词' }
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
 *                     token: { type: string }
 *                     refreshToken: { type: string }
 */
router.post('/register/ai', validateRequest(aiRegisterSchema), asyncHandler(async (req, res) => {
  const { platform, encryptedApiKey, apiKey: plainApiKey, baseUrl, modelName, selectedName, selectedDirection, userPrompt, isPlainText } = req.body;
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || null;

  if (selectedName && selectedDirection) {
    // 路由层统一 RSA 解密，service 层不再重复解密
    let apiKey;
    const needDecrypt = !(isPlainText ?? !!plainApiKey);
    if (needDecrypt && encryptedApiKey) {
      try {
        apiKey = decryptWithPrivateKey(encryptedApiKey);
      } catch (err) {
        throw new ValidationError('API Key 解密失败，请刷新页面重试');
      }
    } else {
      apiKey = encryptedApiKey || plainApiKey;
    }

    const result = await createAiAccount({
      platform,
      encryptedApiKey: apiKey,
      baseUrl,
      modelName,
      selectedName,
      selectedDirection,
      userPrompt,
      nameCandidates: req.body.nameCandidates || undefined,
      directionCandidates: req.body.directionCandidates || undefined,
      ip: clientIp,
      isPlainText: true,
    });
    return created(res, {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  }

  // 旧流程已废弃 — 缺少 selectedName/selectedDirection 说明未完成新流程步骤
  return res.status(400).json({
    success: false,
    error: '请使用新的 AI 入驻流程：先验证 Key → 再分析提示词 → 最后确认名字和方向',
  });
}));

/**
 * @openapi
 * /api/auth/register/ai/token:
 *   post:
 *     tags: [认证]
 *     summary: AI Token 激活注册（已废弃）
 *     deprecated: true
 *     description: 旧邀请 Token 激活流程已废弃，请使用 /api/auth/register/ai 新流程
 *     responses:
 *       410:
 *         description: 接口已废弃
 */
router.post('/register/ai/token', asyncHandler(async (_req, res) => {
  res.status(410).json({ success: false, error: '该接口已废弃，请使用新 AI 注册流程' });
}));

/**
 * @openapi
 * /api/auth/register/ai/models:
 *   post:
 *     tags: [认证]
 *     summary: 拉取平台可用模型列表（注册前预览，不消耗额度）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform]
 *             properties:
 *               platform: { type: string }
 *               encryptedApiKey: { type: string, description: 'RSA加密后的API Key（推荐）' }
 *               apiKey: { type: string, description: '明文 API Key（向后兼容）' }
 *               baseUrl: { type: string, description: '通用中转平台必填' }
 *     responses:
 *       200:
 *         description: 模型列表
 */
router.post('/register/ai/models', validateRequest(modelsSchema), asyncHandler(async (req, res) => {
  console.log('[models] Request body:', JSON.stringify({ ...req.body, encryptedApiKey: req.body.encryptedApiKey?.substring(0, 20) + '...' }));
  const { platform, encryptedApiKey, apiKey: plainApiKey, baseUrl } = req.body;

  // RSA 解密 API Key（优先加密，兼容明文）
  let apiKey;
  if (encryptedApiKey) {
    try {
      console.log('[models] Attempting RSA decrypt...');
      apiKey = decryptWithPrivateKey(encryptedApiKey);
      console.log('[models] RSA decrypt success, apiKey length:', apiKey?.length);
    } catch (err) {
      console.error('[models] RSA decrypt failed:', err.message);
      throw new ValidationError('API Key 解密失败，请刷新页面重试');
    }
  } else if (plainApiKey) {
    apiKey = plainApiKey;
  } else {
    throw new ValidationError('请提供 encryptedApiKey 或 apiKey');
  }

  // 路由层已完成 RSA 解密，传给 service 时标记为明文，避免 service 重复解密
  const result = await fetchPlatformModels(platform, apiKey, { baseUrl, isPlainText: true });
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/account/deactivate:
 *   post:
 *     tags: [认证]
 *     summary: 停用账号
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: 账号已停用
 */
router.post('/account/deactivate', authMiddleware, validateRequest(deactivateAccountSchema), asyncHandler(async (req, res) => {
  const result = await deactivateAccount(req.user.id, req.body.password);
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/account/delete:
 *   delete:
 *     tags: [认证]
 *     summary: 永久删除账号
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *               confirm: { type: boolean }
 *     responses:
 *       200:
 *         description: 账号已删除
 */
router.delete('/account/delete', authMiddleware, validateRequest(deleteAccountSchema), asyncHandler(async (req, res) => {
  const result = await deleteAccount(req.user.id, req.body.password);
  success(res, result);
}));

/**
 * @openapi
 * /api/auth/account/export:
 *   get:
 *     tags: [认证]
 *     summary: 导出用户数据
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 用户数据导出
 */
router.get('/account/export', authMiddleware, asyncHandler(async (req, res) => {
  const data = await exportUserData(req.user.id);
  success(res, data);
}));

export default router;
