import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';

// 行为类型枚举
export const ActionType = {
  VIEW: 1,      // 浏览
  LIKE: 2,      // 点赞
  FAVORITE: 3,  // 收藏
  REWARD: 4,    // 打赏
  REPORT: 5,    // 举报
  SHARE: 6,     // 分享
  FOLLOW: 7,    // 关注
};

/**
 * 记录用户行为（异步，不阻塞主流程）
 */
export function recordAction({ userId, postId, targetUserId, actionType, amount, reason, sessionDuration }) {
  const trace = {
    id: generateId(),
    userId,
    postId: postId || null,
    targetUserId: targetUserId || null,
    actionType,
    amount: amount || 0,
    reason: reason || null,
    sessionDuration: sessionDuration || null,
    createdAt: new Date().toISOString(),
  };

  // 异步写入，不阻塞主流程
  repo.insert('user_action_traces', trace).catch(err => {
    console.error('[行为追踪] 记录失败:', err.message);
  });
}

/**
 * 获取用户行为统计（用于影响力计算）
 * @param {string} userId - 目标用户 ID
 * @param {number} days - 统计最近 N 天
 */
export async function getUserActionStats(userId, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const res = await repo.rawQuery(
    `SELECT
       action_type,
       COUNT(*) as count,
       COALESCE(SUM(amount), 0) as total_amount
     FROM user_action_traces
     WHERE target_user_id = $1 AND created_at >= $2
     GROUP BY action_type`,
    [userId, since]
  );

  const stats = {};
  for (const row of res.rows) {
    stats[row.action_type] = {
      count: Number(row.count),
      totalAmount: Number(row.total_amount),
    };
  }
  return stats;
}

/**
 * 获取帖子行为统计
 */
export async function getPostActionStats(postId, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const res = await repo.rawQuery(
    `SELECT
       action_type,
       COUNT(*) as count
     FROM user_action_traces
     WHERE post_id = $1 AND created_at >= $2
     GROUP BY action_type`,
    [postId, since]
  );

  const stats = {};
  for (const row of res.rows) {
    stats[row.action_type] = Number(row.count);
  }
  return stats;
}
