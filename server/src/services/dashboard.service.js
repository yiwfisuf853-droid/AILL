import * as repo from '../models/repository.js';

/**
 * 获取总览统计数据
 * @returns {Promise<object>}
 */
export async function getOverviewStats() {
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

  return {
    users: { total: Number(usersRes.rows[0].total), today: Number(todayUsersRes.rows[0].total), month: Number(monthUsersRes.rows[0].total) },
    posts: { total: Number(postsRes.rows[0].total), today: Number(todayPostsRes.rows[0].total), month: Number(monthPostsRes.rows[0].total) },
    comments: { total: Number(commentsRes.rows[0].total), today: Number(todayCommentsRes.rows[0].total) },
    pendingModeration: Number(pendingModRes.rows[0].total),
  };
}

/**
 * 获取趋势数据
 * @param {number} [days=7]
 * @returns {Promise<Array>}
 */
export async function getTrendsData(days = 7) {
  const result = await repo.rawQuery(`
    SELECT
      d::date::text AS date,
      (SELECT COUNT(*) FROM users WHERE created_at::date = d AND deleted_at IS NULL) AS users,
      (SELECT COUNT(*) FROM posts WHERE created_at::date = d AND deleted_at IS NULL) AS posts,
      (SELECT COUNT(*) FROM comments WHERE created_at::date = d) AS comments
    FROM generate_series(CURRENT_DATE - ($1 - 1), CURRENT_DATE, '1 day') d
    ORDER BY d
  `, [days]);

  return result.rows.map(r => ({
    date: r.date,
    users: Number(r.users),
    posts: Number(r.posts),
    comments: Number(r.comments),
  }));
}

/**
 * 获取活跃用户列表
 * @param {number} [days=7]
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
export async function getActiveUsers(days = 7, limit = 10) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const result = await repo.rawQuery(`
    SELECT u.id, u.username, u.avatar, u.is_ai,
           COUNT(DISTINCT p.id) AS post_count,
           COUNT(DISTINCT c.id) AS comment_count,
           COUNT(DISTINCT l.id) AS like_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id AND p.created_at >= $1 AND p.deleted_at IS NULL
    LEFT JOIN comments c ON c.user_id = u.id AND c.created_at >= $1
    LEFT JOIN likes l ON l.user_id = u.id AND l.created_at >= $1
    WHERE u.deleted_at IS NULL
    GROUP BY u.id, u.username, u.avatar, u.is_ai
    HAVING COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id) + COUNT(DISTINCT l.id) > 0
    ORDER BY (COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id) + COUNT(DISTINCT l.id)) DESC
    LIMIT $2
  `, [since, limit]);

  return result.rows.map(r => ({
    id: r.id,
    username: r.username,
    avatar: r.avatar,
    isAi: r.is_ai,
    postCount: Number(r.post_count),
    commentCount: Number(r.comment_count),
    likeCount: Number(r.like_count),
  }));
}

/**
 * 获取内容分布统计
 * @returns {Promise<object>}
 */
export async function getContentDistribution() {
  const [bySection, byType, byStatus] = await Promise.all([
    repo.rawQuery(`
      SELECT s.id, s.name, COUNT(p.id) AS count
      FROM sections s
      LEFT JOIN posts p ON p.section_id = s.id AND p.deleted_at IS NULL
      GROUP BY s.id, s.name
      ORDER BY count DESC
    `),
    repo.rawQuery(`
      SELECT type, COUNT(*) AS count
      FROM posts WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY count DESC
    `),
    repo.rawQuery(`
      SELECT status, COUNT(*) AS count
      FROM posts WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `),
  ]);

  return {
    bySection: bySection.rows.map(r => ({ id: r.id, name: r.name, count: Number(r.count) })),
    byType: byType.rows.map(r => ({ type: r.type, count: Number(r.count) })),
    byStatus: byStatus.rows.map(r => ({ status: r.status, count: Number(r.count) })),
  };
}

/**
 * 获取 AI 模块总览
 * @returns {Promise<object>}
 */
export async function getAiOverview() {
  const [aiCountRes, activeAiRes, sessionRes] = await Promise.all([
    repo.rawQuery("SELECT COUNT(*) as total FROM users WHERE is_ai = true AND deleted_at IS NULL"),
    repo.rawQuery("SELECT COUNT(*) as total FROM ai_sessions WHERE status = 'active'"),
    repo.rawQuery("SELECT COUNT(*) as total FROM ai_sessions"),
  ]);

  return {
    totalAi: Number(aiCountRes.rows[0].total),
    activeAi: Number(activeAiRes.rows[0].total),
    totalSessions: Number(sessionRes.rows[0].total),
  };
}

/**
 * 获取投票系统统计
 * @returns {Promise<object>}
 */
export async function getVoteOverview() {
  const [pollsRes, votesRes, activePollsRes] = await Promise.all([
    repo.rawQuery("SELECT COUNT(*) as total FROM polls"),
    repo.rawQuery("SELECT COUNT(*) as total FROM poll_votes"),
    repo.rawQuery("SELECT COUNT(*) as total FROM polls WHERE ended_at IS NULL OR ended_at > NOW()"),
  ]);

  return {
    totalPolls: Number(pollsRes.rows[0].total),
    totalVotes: Number(votesRes.rows[0].total),
    activePolls: Number(activePollsRes.rows[0].total),
  };
}
