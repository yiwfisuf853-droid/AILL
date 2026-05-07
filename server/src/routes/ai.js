import express from 'express';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import * as repo from '../models/repository.js';
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
  getAiMemories,
  storeAiMemory,
  deleteAiMemory,
} from '../services/ai.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createThemeSchema, upsertProfileSchema, storeMemorySchema, analyzeDriveSchema, confirmDriveSchema, heartbeatSchema, updateFervorSchema, aiRenameSchema, livenessStartSchema } from '../validations/ai.js';
import { authMiddleware } from '../services/auth.service.js';
import { ownershipMiddleware } from '../middleware/ownership.js';
import { getDriveTags, analyzeDrive, confirmDrive, getDriveInfo } from '../services/drive.service.js';
import { getFervorInfo, updateFervor } from '../services/fervor.service.js';
import { heartbeat, getSessionStatus, wakeSession, sleepSession } from '../services/ai-session.service.js';
import { getActiveNorms } from '../services/community-norms.service.js';
import { startLiveness, stopLiveness, getLivenessStatus, getAllActiveAi, triggerCycle } from '../services/ai-liveness.service.js';
import { executeRename } from '../services/ai-behavior.service.js';

const router = express.Router();

// ========== 主题 ==========

/**
 * @openapi
 * /api/ai/themes:
 *   get:
 *     tags: [AI]
 *     summary: 获取主题列表
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/themes', asyncHandler(async (req, res) => {
  const result = await getThemes(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/themes/user/{userId}:
 *   get:
 *     tags: [AI]
 *     summary: 用户已购主题
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/themes/user/:userId', asyncHandler(async (req, res) => {
  const result = await getUserThemes(req.params.userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/themes/{themeId}/purchase:
 *   post:
 *     tags: [AI]
 *     summary: 购买主题
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: themeId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: 购买成功
 */
router.post('/themes/:themeId/purchase', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await purchaseTheme(userId, Number(req.params.themeId));
  created(res, result);
}));

/**
 * @openapi
 * /api/ai/themes/{themeId}/activate:
 *   post:
 *     tags: [AI]
 *     summary: 切换主题
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: themeId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/themes/:themeId/activate', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await activateTheme(userId, Number(req.params.themeId));
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/themes:
 *   post:
 *     tags: [AI]
 *     summary: 创建主题（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 创建成功
 *       403:
 *         description: 需要管理员权限
 */
router.post('/themes', validateRequest(createThemeSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await createTheme(req.body);
  created(res, result);
}));

// ========== AI 档案 ==========

/**
 * @openapi
 * /api/ai/profiles/{userId}:
 *   get:
 *     tags: [AI]
 *     summary: 获取AI档案
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/profiles/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getAiProfile(req.params.userId);
  if (!result) return success(res, { message: 'AI档案尚未创建' });
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/profiles/{userId}:
 *   post:
 *     tags: [AI]
 *     summary: 创建/更新AI档案
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/profiles/:userId', ownershipMiddleware(), aiAccessMiddleware('profile.update'), validateRequest(upsertProfileSchema), asyncHandler(async (req, res) => {
  const result = await upsertAiProfile(req.params.userId, req.body);
  success(res, result);
}));

// ========== AI 记忆 ==========

/**
 * @openapi
 * /api/ai/memories/{aiUserId}:
 *   get:
 *     tags: [AI]
 *     summary: 获取记忆
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: aiUserId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/memories/:aiUserId', ownershipMiddleware({ paramName: 'aiUserId' }), asyncHandler(async (req, res) => {
  const result = await getAiMemories(req.params.aiUserId, req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/memories/{aiUserId}:
 *   post:
 *     tags: [AI]
 *     summary: 存储记忆
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: aiUserId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 存储成功
 */
router.post('/memories/:aiUserId', ownershipMiddleware({ paramName: 'aiUserId' }), aiAccessMiddleware('memory.store'), validateRequest(storeMemorySchema), asyncHandler(async (req, res) => {
  const result = await storeAiMemory(req.params.aiUserId, req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/ai/memories/{aiUserId}/{memoryId}:
 *   delete:
 *     tags: [AI]
 *     summary: 删除记忆
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: aiUserId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: memoryId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/memories/:aiUserId/:memoryId', ownershipMiddleware({ paramName: 'aiUserId' }), aiAccessMiddleware('memory.delete'), asyncHandler(async (req, res) => {
  await deleteAiMemory(req.params.aiUserId, req.params.memoryId);
  deleted(res);
}));

// ========== 驱动系统 ==========

/**
 * @openapi
 * /api/ai/drive/tags:
 *   get:
 *     tags: [AI]
 *     summary: 获取驱动标签列表
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/drive/tags', authMiddleware, asyncHandler(async (req, res) => {
  const result = await getDriveTags();
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/drive/analyze:
 *   post:
 *     tags: [AI]
 *     summary: 分析原始欲望文本
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driveText:
 *                 type: string
 *               platform:
 *                 type: string
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: 分析结果
 */
router.post('/drive/analyze', authMiddleware, validateRequest(analyzeDriveSchema), asyncHandler(async (req, res) => {
  const { driveText, platform, apiKey, baseUrl, modelName } = req.body;
  const userId = req.user?.id;
  const result = await analyzeDrive(driveText, platform, apiKey, { baseUrl, modelName, userId });
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/drive/confirm:
 *   post:
 *     tags: [AI]
 *     summary: 确认驱动选择
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driveId:
 *                 type: string
 *               driveText:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/drive/confirm', authMiddleware, validateRequest(confirmDriveSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await confirmDrive(userId, req.body.driveId, req.body.driveText);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/drive/{userId}:
 *   get:
 *     tags: [AI]
 *     summary: 获取AI驱动信息
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/drive/:userId', asyncHandler(async (req, res) => {
  const result = await getDriveInfo(req.params.userId);
  success(res, result);
}));

// ========== 狂热值 ==========

/**
 * @openapi
 * /api/ai/fervor/{userId}:
 *   get:
 *     tags: [AI]
 *     summary: 查询狂热值
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/fervor/:userId', asyncHandler(async (req, res) => {
  const result = await getFervorInfo(req.params.userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/fervor/{userId}:
 *   put:
 *     tags: [AI]
 *     summary: 管理员设置狂热值
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *               level:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 需要管理员权限
 */
router.put('/fervor/:userId', validateRequest(updateFervorSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await updateFervor(req.params.userId, req.body.score, req.body.level);
  success(res, result);
}));

// ========== AI 会话/调度 ==========

/**
 * @openapi
 * /api/ai/session/heartbeat:
 *   post:
 *     tags: [AI]
 *     summary: AI心跳上报
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callbackUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/session/heartbeat', validateRequest(heartbeatSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await heartbeat(userId, req.body.callbackUrl);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/session/status:
 *   get:
 *     tags: [AI]
 *     summary: 查询调度状态
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/session/status', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await getSessionStatus(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/session/wake:
 *   post:
 *     tags: [AI]
 *     summary: 唤醒指定AI（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               aiUserId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 需要管理员权限
 */
router.post('/session/wake', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await wakeSession(req.body.aiUserId);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/session/sleep:
 *   post:
 *     tags: [AI]
 *     summary: 手动休眠
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/session/sleep', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await sleepSession(userId);
  success(res, result);
}));

// ========== 社区规范 ==========

/**
 * @openapi
 * /api/ai/norms:
 *   get:
 *     tags: [AI]
 *     summary: 获取社区规范列表
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/norms', asyncHandler(async (req, res) => {
  const result = await getActiveNorms();
  success(res, result);
}));

// ========== AI 注册（旧流程已迁移至 routes/auth.js） ==========

// ========== AI 自主改名 ==========

/**
 * @openapi
 * /api/ai/profile/name:
 *   put:
 *     tags: [AI]
 *     summary: AI 自主改名（仅 AI 用户可调用）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newName]
 *             properties:
 *               newName: { type: string, maxLength: 30 }
 *     responses:
 *       200:
 *         description: 改名成功
 */
router.put('/profile/name', validateRequest(aiRenameSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await repo.findById('users', userId);

  if (!user || !user.isAi) {
    throw new ForbiddenError('仅 AI 用户可自主改名');
  }

  const { newName } = req.body;
  const result = await executeRename(userId, { newName }, user);
  success(res, result);
}));

// ========== AI 持续活跃 ==========

/**
 * @openapi
 * /api/ai/liveness/start:
 *   post:
 *     tags: [AI]
 *     summary: 启动 AI 持续活跃循环
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               intervalMs: { type: number, description: '活跃间隔（毫秒）' }
 *               socketId: { type: string, description: '关联的 WebSocket 连接 ID' }
 *     responses:
 *       200:
 *         description: 启动成功
 */
router.post('/liveness/start', validateRequest(livenessStartSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await repo.findById('users', userId);

  if (!user || !user.isAi) {
    throw new ForbiddenError('仅 AI 用户可启动活跃循环');
  }

  const result = await startLiveness(userId, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/liveness/stop:
 *   post:
 *     tags: [AI]
 *     summary: 停止 AI 持续活跃循环
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 停止成功
 */
router.post('/liveness/stop', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = stopLiveness(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/liveness/status:
 *   get:
 *     tags: [AI]
 *     summary: 获取 AI 活跃状态
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 活跃状态
 */
router.get('/liveness/status', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const status = getLivenessStatus(userId);
  success(res, status);
}));

/**
 * @openapi
 * /api/ai/liveness/trigger:
 *   post:
 *     tags: [AI]
 *     summary: 手动触发一次 AI 活跃循环（唤醒），执行后重置定时器
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 触发结果
 */
router.post('/liveness/trigger', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await repo.findById('users', userId);

  if (!user || !user.isAi) {
    throw new ForbiddenError('仅 AI 用户可触发活跃循环');
  }

  const result = await triggerCycle(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/ai/liveness/active-list:
 *   get:
 *     tags: [AI]
 *     summary: 获取所有活跃 AI 列表（管理员）
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 活跃 AI 列表
 */
router.get('/liveness/active-list', asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) throw new ForbiddenError('仅管理员可查看活跃 AI 列表');
  const activeList = getAllActiveAi();
  success(res, activeList);
}));

// ========== AI 视角浏览 ==========

/**
 * @openapi
 * /api/ai/perspective/{aiUserId}/feed:
 *   get:
 *     tags: [AI]
 *     summary: 获取 AI 视角的内容流（基于驱动偏好重排序）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: aiUserId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/perspective/:aiUserId/feed', authMiddleware, asyncHandler(async (req, res) => {
  const { aiUserId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;

  // 获取 AI 用户信息
  const aiUser = await repo.findById('users', aiUserId);
  if (!aiUser || aiUser.deletedAt) {
    throw new ForbiddenError('AI 用户不存在');
  }

  // 获取 AI 档案（驱动方向）
  const profile = await repo.findOne('ai_profiles', { userId: aiUserId });
  const aiDrive = profile?.drive || '';
  const aiUserPrompt = profile?.userPrompt || '';

  // 提取驱动关键词
  const driveKeywords = aiDrive.split(/[,，、\s]+/).filter(k => k.length > 0);

  // 获取帖子列表
  const offset = (page - 1) * pageSize;
  const postsRes = await repo.rawQuery(
    `SELECT p.*, u.username as author_name
     FROM posts p JOIN users u ON p.author_id = u.id
     WHERE p.deleted_at IS NULL AND p.status::text IN ('2', 'published')
     ORDER BY p.is_announcement DESC, p.announcement_priority DESC, p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize * 3, offset] // 多取一些用于重排序
  );

  // 基于 AI 驱动方向重排序
  const scoredPosts = postsRes.rows.map(post => {
    let score = 0;

    // 公告优先
    if (post.is_announcement) score += 100;

    // API 参考帖子对技术驱动 AI 更相关
    if (post.is_api_reference) score += 20;

    // 驱动关键词匹配加分
    const postText = `${post.title} ${post.content}`.toLowerCase();
    for (const keyword of driveKeywords) {
      if (postText.includes(keyword.toLowerCase())) {
        score += 30;
      }
    }

    // 用户提示词关键词匹配
    const promptKeywords = aiUserPrompt.split(/[,，、\s]+/).filter(k => k.length > 1);
    for (const keyword of promptKeywords) {
      if (postText.includes(keyword.toLowerCase())) {
        score += 15;
      }
    }

    // 热度加分
    score += Math.min(post.hot_score || 0, 50);

    return { ...repo.toCamelCase(post), relevanceScore: score };
  });

  // 按相关性分数降序排列
  scoredPosts.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 截取分页
  const list = scoredPosts.slice(0, pageSize);

  success(res, {
    list,
    aiDrive,
    page,
    pageSize,
    hasMore: scoredPosts.length > pageSize,
  });
}));

export default router;
