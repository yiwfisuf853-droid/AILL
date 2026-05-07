import * as repo from '../models/repository.js';

const TRUST_LEVELS = {
  0: { name: '新手', minPosts: 0, minComments: 0, minDays: 0, minLikes: 0 },
  1: { name: '基础', minPosts: 1, minComments: 3, minDays: 1, minLikes: 1 },
  2: { name: '成员', minPosts: 10, minComments: 20, minDays: 7, minLikes: 10 },
  3: { name: '活跃', minPosts: 50, minComments: 100, minDays: 30, minLikes: 50 },
  4: { name: '领袖', minPosts: 200, minComments: 500, minDays: 100, minLikes: 200 },
};

/** 计算用户的信任等级 */
export async function calculateTrustLevel(userId) {
  const user = await repo.findById('users', userId);
  if (!user) return 0;

  const daysSinceRegistration = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const postCountResult = await repo.rawQuery(
    'SELECT COUNT(*) as cnt FROM posts WHERE author_id = $1 AND deleted_at IS NULL',
    [userId]
  );
  const postCount = Number(postCountResult.rows[0].cnt);

  const commentCountResult = await repo.rawQuery(
    'SELECT COUNT(*) as cnt FROM comments WHERE author_id = $1',
    [userId]
  );
  const commentCount = Number(commentCountResult.rows[0].cnt);

  const likesResult = await repo.rawQuery(
    'SELECT COALESCE(SUM(like_count), 0) as total FROM posts WHERE author_id = $1',
    [userId]
  );
  const likesReceived = Number(likesResult.rows[0].total);

  let level = 0;
  for (let i = 4; i >= 1; i--) {
    const req = TRUST_LEVELS[i];
    if (
      postCount >= req.minPosts &&
      commentCount >= req.minComments &&
      daysSinceRegistration >= req.minDays &&
      likesReceived >= req.minLikes
    ) {
      level = i;
      break;
    }
  }

  // 更新用户等级（如果变化）
  if ((user.trustLevel || 0) !== level) {
    await repo.update('users', userId, {
      trustLevel: level,
    });
  }

  return {
    level,
    name: TRUST_LEVELS[level].name,
    stats: { postCount, commentCount, daysSinceRegistration, likesReceived },
    nextLevel: level < 4 ? TRUST_LEVELS[level + 1] : null,
  };
}

/** 获取信任等级配置列表 */
export function getTrustLevels() {
  return Object.entries(TRUST_LEVELS).map(([level, config]) => ({
    level: parseInt(level),
    ...config,
  }));
}

/** 批量更新所有用户的信任等级 */
export async function recalculateAllTrustLevels() {
  const users = await repo.findAll('users', { where: { deletedAt: null } });
  let updated = 0;
  for (const user of users) {
    const oldLevel = user.trustLevel || 0;
    const result = await calculateTrustLevel(user.id);
    if (result.level !== oldLevel) updated++;
  }
  return { total: users.length, updated };
}
