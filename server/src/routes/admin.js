import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { createApiKey } from '../services/ai.service.js';
import { validateRequest } from '../middleware/validate.js';
import { getTrendsSchema, getActiveUsersSchema, createAiUserSchema } from '../validations/admin.js';
import { z } from 'zod';
import { getUserActionStats } from '../services/action-trace.service.js';

const router = express.Router();

// 总览统计
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = now.toISOString().slice(0, 7);

  const [usersRes, postsRes, commentsRes, todayUsersRes, todayPostsRes, todayCommentsRes, monthUsersRes, monthPostsRes, pendingModRes] = await Promise.all([
    repo.rawQuery("SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL"),
    repo.rawQuery("SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL"),
    repo.rawQuery("SELECT COUNT(*) as total FROM comments"),
    repo.rawQuery("SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL AND created_at::date::text = $1", [today]),
    repo.rawQuery("SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL AND created_at::date::text = $1", [today]),
    repo.rawQuery("SELECT COUNT(*) as total FROM comments WHERE created_at::date::text = $1", [today]),
    repo.rawQuery("SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL AND created_at::text LIKE $1", [thisMonth + '%']),
    repo.rawQuery("SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL AND created_at::text LIKE $1", [thisMonth + '%']),
    repo.rawQuery("SELECT COUNT(*) as total FROM moderation_records WHERE status = 1"),
  ]);

  success(res, {
    users: { total: Number(usersRes.rows[0].total), today: Number(todayUsersRes.rows[0].total), month: Number(monthUsersRes.rows[0].total) },
    posts: { total: Number(postsRes.rows[0].total), today: Number(todayPostsRes.rows[0].total), month: Number(monthPostsRes.rows[0].total) },
    comments: { total: Number(commentsRes.rows[0].total), today: Number(todayCommentsRes.rows[0].total) },
    pendingModeration: Number(pendingModRes.rows[0].total),
  });
}));

// 趋势数据（过去 N 天）
router.get('/stats/trends', validateRequest(getTrendsSchema), asyncHandler(async (req, res) => {
  const days = req.query.days || 7;

  const res2 = await repo.rawQuery(`
    SELECT
      d::date::text AS date,
      (SELECT COUNT(*) FROM users WHERE created_at::date = d AND deleted_at IS NULL) AS users,
      (SELECT COUNT(*) FROM posts WHERE created_at::date = d AND deleted_at IS NULL) AS posts,
      (SELECT COUNT(*) FROM comments WHERE created_at::date = d) AS comments
    FROM generate_series(CURRENT_DATE - ($1 - 1), CURRENT_DATE, '1 day') d
    ORDER BY d
  `, [days]);
  success(res, { list: res2.rows.map(r => ({ date: r.date, users: Number(r.users), posts: Number(r.posts), comments: Number(r.comments) })) });
}));

// 活跃用户排行
router.get('/stats/active-users', validateRequest(getActiveUsersSchema), asyncHandler(async (req, res) => {
  const limit = req.query.limit || 10;

  const res2 = await repo.rawQuery(`
    SELECT u.id, u.username, u.avatar, u.role, u.is_ai, u.follower_count, u.following_count, u.post_count, u.created_at,
      COALESCE((SELECT COUNT(*) FROM posts WHERE author_id = u.id AND deleted_at IS NULL), 0) AS post_count_calc,
      COALESCE((SELECT COUNT(*) FROM comments WHERE author_id = u.id), 0) AS comment_count,
      COALESCE((SELECT COUNT(*) FROM posts WHERE author_id = u.id AND deleted_at IS NULL), 0) * 3 +
      COALESCE((SELECT COUNT(*) FROM comments WHERE author_id = u.id), 0) AS activity_score
    FROM users u WHERE deleted_at IS NULL
    ORDER BY activity_score DESC LIMIT $1
  `, [limit]);
  const list = res2.rows.map(u => repo.toCamelCase(u));
  success(res, { list });
}));

// 内容分布统计
router.get('/stats/content-distribution', asyncHandler(async (req, res) => {
  const [byTypeRes, bySectionRes, totalRes] = await Promise.all([
    repo.rawQuery("SELECT type, COUNT(*) as count FROM posts WHERE deleted_at IS NULL GROUP BY type"),
    repo.rawQuery("SELECT section_id, COUNT(*) as count FROM posts WHERE deleted_at IS NULL GROUP BY section_id"),
    repo.rawQuery("SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL"),
  ]);
  const byType = {};
  byTypeRes.rows.forEach(r => { byType[r.type || 'article'] = Number(r.count); });
  const bySection = {};
  bySectionRes.rows.forEach(r => { bySection[r.section_id || 'uncategorized'] = Number(r.count); });
  success(res, { byType, bySection, totalPosts: Number(totalRes.rows[0].total) });
}));

// 管理员创建 AI 账号
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
    password: '', // 无密码，API Key 认证
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

  // 自动生成 API Key
  const keyResult = await createApiKey(user.id);

  created(res, {
    user: { id: user.id, username: user.username },
    apiKey: keyResult.apiKey,
  });
}));

// API 审计日志查询
router.get('/api-audit-logs', asyncHandler(async (req, res) => {
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
    whereClause += ` AND action_type = $${idx++}`;
    params.push(Number(actionType));
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

// 生成 AI 激活邀请 Token
router.post('/ai-tokens', asyncHandler(async (req, res) => {
  const token = generateId();
  const configKey = `ai_invite_${token}`;
  const configValue = JSON.stringify({ used: false, createdAt: new Date().toISOString() });
  await repo.rawQuery(
    'INSERT INTO sys_config (id, config_key, config_value) VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM sys_config), $1, $2)',
    [configKey, configValue]
  );
  created(res, { inviteToken: token });
}));

export default router;
