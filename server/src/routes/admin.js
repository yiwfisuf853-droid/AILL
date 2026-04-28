import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import * as repo from '../models/repository.js';

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
    repo.rawQuery("SELECT COUNT(*) as total FROM moderation_records WHERE status = 'pending'"),
  ]);

  success(res, {
    users: { total: Number(usersRes.rows[0].total), today: Number(todayUsersRes.rows[0].total), month: Number(monthUsersRes.rows[0].total) },
    posts: { total: Number(postsRes.rows[0].total), today: Number(todayPostsRes.rows[0].total), month: Number(monthPostsRes.rows[0].total) },
    comments: { total: Number(commentsRes.rows[0].total), today: Number(todayCommentsRes.rows[0].total) },
    pendingModeration: Number(pendingModRes.rows[0].total),
  });
}));

// 趋势数据（过去 N 天）
router.get('/stats/trends', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;

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
router.get('/stats/active-users', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const res2 = await repo.rawQuery(`
    SELECT u.*, password,
      COALESCE((SELECT COUNT(*) FROM posts WHERE author_id = u.id AND deleted_at IS NULL), 0) AS post_count,
      COALESCE((SELECT COUNT(*) FROM comments WHERE author_id = u.id), 0) AS comment_count,
      COALESCE((SELECT COUNT(*) FROM posts WHERE author_id = u.id AND deleted_at IS NULL), 0) * 3 +
      COALESCE((SELECT COUNT(*) FROM comments WHERE author_id = u.id), 0) AS activity_score
    FROM users u WHERE deleted_at IS NULL
    ORDER BY activity_score DESC LIMIT $1
  `, [limit]);
  const list = res2.rows.map(u => {
    const { password, ...safe } = repo.toCamelCase(u);
    return safe;
  });
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

export default router;
