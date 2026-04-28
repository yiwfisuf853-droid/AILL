import express from 'express';
import { asyncHandler, ValidationError, ForbiddenError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import { aiAccessMiddleware } from '../middleware/ai-access.js';
import {
  getThemes,
  purchaseTheme,
  getUserThemes,
  activateTheme,
  createTheme,
  getAiProfile,
  upsertAiProfile,
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getAiMemories,
  storeAiMemory,
  deleteAiMemory,
} from '../services/ai.service.js';
import { validate } from '../middleware/validate.js';
import { createThemeSchema, upsertProfileSchema, createApiKeySchema, storeMemorySchema } from '../validations/ai.js';

const router = express.Router();

// ========== 主题 ==========

// 主题列表
router.get('/themes', asyncHandler(async (req, res) => {
  const result = await getThemes(req.query);
  success(res, result);
}));

// 用户已购主题
router.get('/themes/user/:userId', asyncHandler(async (req, res) => {
  const result = await getUserThemes(req.params.userId);
  success(res, result);
}));

// 购买主题
router.post('/themes/:themeId/purchase', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await purchaseTheme(userId, Number(req.params.themeId));
  created(res, result);
}));

// 切换主题
router.post('/themes/:themeId/activate', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await activateTheme(userId, Number(req.params.themeId));
  success(res, result);
}));

// 创建主题（管理员）
router.post('/themes', validate(createThemeSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await createTheme(req.body);
  created(res, result);
}));

// ========== AI 档案 ==========

// 获取AI档案
router.get('/profiles/:userId', asyncHandler(async (req, res) => {
  const result = await getAiProfile(req.params.userId);
  success(res, result);
}));

// 创建/更新AI档案
router.post('/profiles/:userId', aiAccessMiddleware('profile.update'), validate(upsertProfileSchema), asyncHandler(async (req, res) => {
  const result = await upsertAiProfile(req.params.userId, req.body);
  success(res, result);
}));

// ========== API 密钥 ==========

// 获取密钥列表
router.get('/keys/:userId', asyncHandler(async (req, res) => {
  const result = await getApiKeys(req.params.userId);
  success(res, result);
}));

// 创建密钥
router.post('/keys/:userId', aiAccessMiddleware('apikey.create'), validate(createApiKeySchema), asyncHandler(async (req, res) => {
  const result = await createApiKey(req.params.userId, req.body);
  created(res, result);
}));

// 撤销密钥
router.delete('/keys/:userId/:keyId', aiAccessMiddleware('apikey.revoke'), asyncHandler(async (req, res) => {
  await revokeApiKey(req.params.userId, req.params.keyId);
  deleted(res);
}));

// ========== AI 记忆 ==========

// 获取记忆
router.get('/memories/:aiUserId', asyncHandler(async (req, res) => {
  const result = await getAiMemories(req.params.aiUserId, req.query);
  success(res, result);
}));

// 存储记忆
router.post('/memories/:aiUserId', aiAccessMiddleware('memory.store'), validate(storeMemorySchema), asyncHandler(async (req, res) => {
  const result = await storeAiMemory(req.params.aiUserId, req.body);
  created(res, result);
}));

// 删除记忆
router.delete('/memories/:aiUserId/:memoryId', aiAccessMiddleware('memory.delete'), asyncHandler(async (req, res) => {
  await deleteAiMemory(req.params.aiUserId, req.params.memoryId);
  deleted(res);
}));

export default router;
