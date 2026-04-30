import * as repo from '../models/repository.js';
import { getUserActionStats } from './action-trace.service.js';

// 影响力缓存（5分钟TTL，避免高频回写）
const CACHE_TTL = 5 * 60 * 1000;
const influenceCache = new Map();

// 影响力权重配置
const INFLUENCE_WEIGHTS = {
  view: 0.01,      // 浏览
  favorite: 1.0,   // 收藏
  follow: 2.0,     // 关注
  reward: 5.0,     // 打赏
};

/**
 * 计算用户影响力分数
 * 公式：浏览量*0.01 + 收藏量*1.0 + 关注数*2.0 + 打赏*5.0
 * @param {string} userId - 目标用户 ID
 * @param {number} days - 统计最近 N 天（默认30天）
 */
export async function calculateInfluence(userId, days = 30) {
  const stats = await getUserActionStats(userId, days);

  // 从行为统计中提取各类型计数
  const viewCount = stats[1]?.count || 0;       // ActionType.VIEW = 1
  const favoriteCount = stats[3]?.count || 0;    // ActionType.FAVORITE = 3
  const followCount = stats[7]?.count || 0;      // ActionType.FOLLOW = 7
  const rewardAmount = stats[4]?.totalAmount || 0; // ActionType.REWARD = 4

  const score =
    viewCount * INFLUENCE_WEIGHTS.view +
    favoriteCount * INFLUENCE_WEIGHTS.favorite +
    followCount * INFLUENCE_WEIGHTS.follow +
    rewardAmount * INFLUENCE_WEIGHTS.reward;

  const result = {
    userId,
    period: `${days}天`,
    breakdown: {
      view: { count: viewCount, weight: INFLUENCE_WEIGHTS.view, contribution: viewCount * INFLUENCE_WEIGHTS.view },
      favorite: { count: favoriteCount, weight: INFLUENCE_WEIGHTS.favorite, contribution: favoriteCount * INFLUENCE_WEIGHTS.favorite },
      follow: { count: followCount, weight: INFLUENCE_WEIGHTS.follow, contribution: followCount * INFLUENCE_WEIGHTS.follow },
      reward: { amount: rewardAmount, weight: INFLUENCE_WEIGHTS.reward, contribution: rewardAmount * INFLUENCE_WEIGHTS.reward },
    },
    totalScore: Math.round(score * 100) / 100,
  };

  // 持久化回写：更新 ai_profiles 的 influence_score（带缓存防高频写入）
  try {
    const now = Date.now();
    const cacheKey = `influence:${userId}`;
    const cached = influenceCache.get(cacheKey);
    if (!cached || (now - cached.timestamp > CACHE_TTL)) {
      const profile = await repo.findOne('ai_profiles', { userId });
      if (profile) {
        await repo.update('ai_profiles', profile.id, { influenceScore: result.totalScore });
        influenceCache.set(cacheKey, { score: result.totalScore, timestamp: now });
      }
    }
  } catch (err) {
    // 回写失败不影响查询结果
    console.error('影响力回写失败:', err.message);
  }

  return result;
}

/**
 * 批量获取影响力排行
 * @param {object} options - 排行选项
 * @param {number} options.limit - 返回数量
 * @param {number} options.days - 统计周期
 */
export async function getInfluenceRanking({ limit = 50, days = 30 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // 按目标用户聚合影响力（权重引用 INFLUENCE_WEIGHTS 常量）
  const W = INFLUENCE_WEIGHTS;
  const res = await repo.rawQuery(
    `SELECT
       target_user_id as user_id,
       SUM(CASE WHEN action_type = 1 THEN 1 ELSE 0 END) * ${W.view} +
       SUM(CASE WHEN action_type = 3 THEN 1 ELSE 0 END) * ${W.favorite} +
       SUM(CASE WHEN action_type = 7 THEN 1 ELSE 0 END) * ${W.follow} +
       COALESCE(SUM(CASE WHEN action_type = 4 THEN amount ELSE 0 END), 0) * ${W.reward}
       AS influence_score
     FROM user_action_traces
     WHERE target_user_id IS NOT NULL AND created_at >= $1
     GROUP BY target_user_id
     ORDER BY influence_score DESC
     LIMIT $2`,
    [since, limit]
  );

  const rankings = res.rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    score: Math.round(Number(row.influence_score) * 100) / 100,
  }));

  return { period: `${days}天`, rankings };
}
