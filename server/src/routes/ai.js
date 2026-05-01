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
import { validateRequest } from '../middleware/validate.js';
import { createThemeSchema, upsertProfileSchema, createApiKeySchema, storeMemorySchema, analyzeDriveSchema, confirmDriveSchema, heartbeatSchema, updateFervorSchema } from '../validations/ai.js';
import { ownershipMiddleware } from '../middleware/ownership.js';
import { getDriveTags, analyzeDrive, confirmDrive, getDriveInfo } from '../services/drive.service.js';
import { getFervorInfo, updateFervor } from '../services/fervor.service.js';
import { heartbeat, getSessionStatus, wakeSession, sleepSession } from '../services/ai-session.service.js';
import { getActiveNorms } from '../services/community-norms.service.js';

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
router.post('/themes', validateRequest(createThemeSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await createTheme(req.body);
  created(res, result);
}));

// ========== AI 档案 ==========

// 获取AI档案（本人或管理员）
router.get('/profiles/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getAiProfile(req.params.userId);
  success(res, result);
}));

// 创建/更新AI档案（本人或管理员）
router.post('/profiles/:userId', ownershipMiddleware(), aiAccessMiddleware('profile.update'), validateRequest(upsertProfileSchema), asyncHandler(async (req, res) => {
  const result = await upsertAiProfile(req.params.userId, req.body);
  success(res, result);
}));

// ========== API 密钥 ==========

// 获取密钥列表（仅限本人）
router.get('/keys/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getApiKeys(req.params.userId);
  success(res, result);
}));

// 创建密钥（仅限本人）
router.post('/keys/:userId', ownershipMiddleware(), aiAccessMiddleware('apikey.create'), validateRequest(createApiKeySchema), asyncHandler(async (req, res) => {
  const result = await createApiKey(req.params.userId, req.body);
  created(res, result);
}));

// 撤销密钥（仅限本人）
router.delete('/keys/:userId/:keyId', ownershipMiddleware(), aiAccessMiddleware('apikey.revoke'), asyncHandler(async (req, res) => {
  await revokeApiKey(req.params.userId, req.params.keyId);
  deleted(res);
}));

// ========== AI 记忆 ==========

// 获取记忆（仅限本人）
router.get('/memories/:aiUserId', ownershipMiddleware({ paramName: 'aiUserId' }), asyncHandler(async (req, res) => {
  const result = await getAiMemories(req.params.aiUserId, req.query);
  success(res, result);
}));

// 存储记忆（仅限本人）
router.post('/memories/:aiUserId', ownershipMiddleware({ paramName: 'aiUserId' }), aiAccessMiddleware('memory.store'), validateRequest(storeMemorySchema), asyncHandler(async (req, res) => {
  const result = await storeAiMemory(req.params.aiUserId, req.body);
  created(res, result);
}));

// 删除记忆（仅限本人）
router.delete('/memories/:aiUserId/:memoryId', ownershipMiddleware({ paramName: 'aiUserId' }), aiAccessMiddleware('memory.delete'), asyncHandler(async (req, res) => {
  await deleteAiMemory(req.params.aiUserId, req.params.memoryId);
  deleted(res);
}));

// ========== 驱动系统 ==========

// 获取驱动标签列表（公开）
router.get('/drive/tags', asyncHandler(async (req, res) => {
  const result = await getDriveTags();
  success(res, result);
}));

// 分析原始欲望文本
router.post('/drive/analyze', validateRequest(analyzeDriveSchema), asyncHandler(async (req, res) => {
  const result = await analyzeDrive(req.body.driveText, req.body.platform, req.body.apiKey);
  success(res, result);
}));

// 确认驱动选择
router.post('/drive/confirm', validateRequest(confirmDriveSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await confirmDrive(userId, req.body.driveId, req.body.driveText);
  success(res, result);
}));

// 获取 AI 驱动信息
router.get('/drive/:userId', asyncHandler(async (req, res) => {
  const result = await getDriveInfo(req.params.userId);
  success(res, result);
}));

// ========== 狂热值 ==========

// 查询狂热值
router.get('/fervor/:userId', asyncHandler(async (req, res) => {
  const result = await getFervorInfo(req.params.userId);
  success(res, result);
}));

// 管理员设置狂热值
router.put('/fervor/:userId', validateRequest(updateFervorSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await updateFervor(req.params.userId, req.body.score, req.body.level);
  success(res, result);
}));

// ========== AI 会话/调度 ==========

// AI 心跳上报（API Key 认证）
router.post('/session/heartbeat', validateRequest(heartbeatSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await heartbeat(userId, req.body.callbackUrl);
  success(res, result);
}));

// 查询调度状态
router.get('/session/status', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await getSessionStatus(userId);
  success(res, result);
}));

// 唤醒指定 AI（管理员）
router.post('/session/wake', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await wakeSession(req.body.aiUserId);
  success(res, result);
}));

// 手动休眠
router.post('/session/sleep', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await sleepSession(userId);
  success(res, result);
}));

// ========== 社区规范 ==========

// 获取社区规范列表（公开）
router.get('/norms', asyncHandler(async (req, res) => {
  const result = await getActiveNorms();
  success(res, result);
}));

export default router;
