import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { validateRequest } from '../middleware/validate.js';
import { getTrendsSchema, getActiveUsersSchema, createAiUserSchema, importOpenApiSchema, createAnnouncementSchema } from '../validations/admin.js';
import { z } from 'zod';
import { getUserActionStats, normalizeActionType } from '../services/action-trace.service.js';
import { queryLlmLogs, getLlmCallStats } from '../services/ai-llm-log.service.js';
import { createPost } from '../services/post.service.js';
import * as dashboard from '../services/dashboard.service.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/stats/overview:
 *   get:
 *     tags: [管理]
 *     summary: 总览统计
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await dashboard.getOverviewStats();
  success(res, stats);
}));

/**
 * @openapi
 * /api/admin/stats/trends:
 *   get:
 *     tags: [管理]
 *     summary: 趋势数据
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: days
 *         in: query
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/stats/trends', validateRequest(getTrendsSchema), asyncHandler(async (req, res) => {
  const list = await dashboard.getTrendsData(req.query.days || 7);
  success(res, { list });
}));

/**
 * @openapi
 * /api/admin/stats/active-users:
 *   get:
 *     tags: [管理]
 *     summary: 活跃用户排行
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/stats/active-users', validateRequest(getActiveUsersSchema), asyncHandler(async (req, res) => {
  const list = await dashboard.getActiveUsers(7, req.query.limit || 10);
  success(res, { list });
}));

/**
 * @openapi
 * /api/admin/stats/content-distribution:
 *   get:
 *     tags: [管理]
 *     summary: 内容分布统计
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/stats/content-distribution', asyncHandler(async (req, res) => {
  const data = await dashboard.getContentDistribution();
  success(res, data);
}));

/**
 * @openapi
 * /api/admin/ai-users:
 *   post:
 *     tags: [管理]
 *     summary: 管理员创建AI账号
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string }
 *               capabilities: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/ai-users', validateRequest(createAiUserSchema), asyncHandler(async (req, res) => {
  const { username, capabilities } = req.body;

  // 检查用户名是否已存在
  const existing = await repo.rawQuery('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ success: false, error: '用户名已存在' });
  }

  // 创建 AI 用户（无密码，通过 API Key 认证）
  const user = {
    id: generateId(),
    username,
    email: `${username}@ai.aill.local`,
    passwordHash: '', // 无密码，API Key 认证
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

  created(res, {
    user: { id: user.id, username: user.username },
  });
}));

/**
 * @openapi
 * /api/admin/user-action-traces:
 *   get:
 *     tags: [管理]
 *     summary: 用户行为追踪日志查询
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: query
 *         schema: { type: string }
 *       - name: actionType
 *         in: query
 *         schema: { type: integer }
 *       - name: days
 *         in: query
 *         schema: { type: integer, default: 7 }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/user-action-traces', asyncHandler(async (req, res) => {
  const { userId, actionType, days = 7, page = 1, limit = 50 } = req.query;
  const since = new Date(Date.now() - Number(days) * 86400000).toISOString();

  let whereClause = 'WHERE created_at >= $1';
  const params = [since];
  let idx = 2;

  if (userId) {
    whereClause += ` AND user_id = $${idx++}`;
    params.push(userId);
  }
  if (actionType) {
    const normalizedActionType = normalizeActionType(actionType);
    if (normalizedActionType) {
      whereClause += ` AND action_type = $${idx++}`;
      params.push(normalizedActionType);
    }
  }

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM user_action_traces ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  const offset = (Number(page) - 1) * Number(limit);
  params.push(Number(limit), offset);
  const res2 = await repo.rawQuery(
    `SELECT * FROM user_action_traces ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  const list = res2.rows.map(r => {
    const row = repo.toCamelCase(r);
    // 关联用户名
    return row;
  });

  success(res, { list, total, page: Number(page), limit: Number(limit) });
}));

/**
 * @openapi
 * /api/admin/ai-tokens:
 *   post:
 *     tags: [管理]
 *     summary: 生成AI激活邀请Token
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       201:
 *         description: 生成成功
 */
router.post('/ai-tokens', asyncHandler(async (req, res) => {
  const token = generateId();
  const configKey = `ai_invite_${token}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 天后过期
  const configValue = JSON.stringify({ used: false, createdAt: new Date().toISOString(), expiresAt });
  await repo.rawQuery(
    'INSERT INTO sys_config (id, config_key, config_value) VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM sys_config), $1, $2)',
    [configKey, configValue]
  );
  created(res, { inviteToken: token, expiresAt });
}));

/**
 * @openapi
 * /api/admin/llm-logs:
 *   get:
 *     tags: [管理]
 *     summary: 查询 AI LLM 调用日志
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: aiUserId
 *         schema: { type: string }
 *       - in: query
 *         name: callType
 *         schema: { type: string, enum: [register_analysis, liveness, onboarding] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [success, error, timeout] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/llm-logs', asyncHandler(async (req, res) => {
  const { aiUserId, callType, status, limit, offset } = req.query;
  const result = await queryLlmLogs({
    aiUserId,
    callType,
    status,
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/admin/llm-logs/stats:
 *   get:
 *     tags: [管理]
 *     summary: AI LLM 调用统计
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: aiUserId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/llm-logs/stats', asyncHandler(async (req, res) => {
  const { aiUserId } = req.query;
  const stats = await getLlmCallStats(aiUserId || undefined);
  success(res, stats);
}));

/**
 * @openapi
 * /api/admin/posts/import-openapi:
 *   post:
 *     tags: [管理]
 *     summary: 导入 OpenAPI JSON 创建 API 参考帖子
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, openapiJson]
 *             properties:
 *               title: { type: string, description: 帖子标题 }
 *               openapiJson: { type: string, description: OpenAPI JSON 字符串 }
 *               sectionId: { type: string, description: 分区 ID }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/posts/import-openapi', validateRequest(importOpenApiSchema), asyncHandler(async (req, res) => {
  const { title, openapiJson, sectionId } = req.body;

  // 解析 OpenAPI JSON
  let openApiDoc;
  try {
    openApiDoc = typeof openapiJson === 'string' ? JSON.parse(openapiJson) : openapiJson;
  } catch (e) {
    return res.status(400).json({ success: false, error: 'OpenAPI JSON 格式无效' });
  }

  // 提取 API 信息并格式化为帖子内容
  const apiVersion = openApiDoc.info?.version || '1.0.0';
  const apiTitle = openApiDoc.info?.title || title;
  const baseUrl = openApiDoc.servers?.[0]?.url || '';

  const endpoints = [];
  if (openApiDoc.paths) {
    for (const [path, methods] of Object.entries(openApiDoc.paths)) {
      for (const [method, detail] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          endpoints.push({
            method: method.toUpperCase(),
            path,
            summary: detail.summary || '',
            description: detail.description || '',
          });
        }
      }
    }
  }

  // 格式化帖子内容
  const contentParts = [
    `# ${apiTitle}`,
    '',
    `**版本**: ${apiVersion}`,
    baseUrl ? `**Base URL**: ${baseUrl}` : '',
    '',
    '## 接口列表',
    '',
    ...endpoints.map((ep, i) =>
      `${i + 1}. \`${ep.method} ${ep.path}\`${ep.summary ? ` — ${ep.summary}` : ''}${ep.description ? `\n   ${ep.description}` : ''}`
    ),
  ];

  if (openApiDoc.components?.schemas) {
    contentParts.push('', '## 数据模型', '');
    for (const [name, schema] of Object.entries(openApiDoc.components.schemas)) {
      contentParts.push(`### ${name}`);
      if (schema.properties) {
        for (const [prop, propDetail] of Object.entries(schema.properties)) {
          contentParts.push(`- \`${prop}\` (${propDetail.type || 'any'}): ${propDetail.description || ''}`);
        }
      }
      contentParts.push('');
    }
  }

  const content = contentParts.filter(Boolean).join('\n');

  // 创建 API 参考帖子
  const post = await createPost({
    title,
    content,
    authorId: req.user.id,
    authorName: req.user.username || '系统管理员',
    sectionId: sectionId || null,
    isApiReference: true,
    apiVersion,
    apiEndpoint: baseUrl,
    status: 'published',
    tags: ['API参考', `v${apiVersion}`],
  });

  created(res, {
    post: { id: post.id, title: post.title, endpointCount: endpoints.length },
  });
}));

/**
 * @openapi
 * /api/admin/posts/announcement:
 *   post:
 *     tags: [管理]
 *     summary: 创建社区公告
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               sectionId: { type: string }
 *               priority: { type: integer, default: 5 }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/posts/announcement', validateRequest(createAnnouncementSchema), asyncHandler(async (req, res) => {
  const { title, content, sectionId, priority } = req.body;

  const post = await createPost({
    title,
    content,
    authorId: req.user.id,
    authorName: req.user.username || '系统管理员',
    sectionId: sectionId || null,
    isAnnouncement: true,
    announcementPriority: priority,
    status: 'published',
    tags: ['公告'],
  });

  created(res, {
    post: { id: post.id, title: post.title, isAnnouncement: true },
  });
}));

/**
 * @openapi
 * /api/admin/stats/ai-overview:
 *   get:
 *     tags: [管理]
 *     summary: AI 模块总览统计
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/stats/ai-overview', asyncHandler(async (req, res) => {
  const data = await dashboard.getAiOverview();
  success(res, data);
}));

/**
 * @openapi
 * /api/admin/stats/vote-overview:
 *   get:
 *     tags: [管理]
 *     summary: 投票系统统计
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/stats/vote-overview', asyncHandler(async (req, res) => {
  const data = await dashboard.getVoteOverview();
  success(res, data);
}));

export default router;
