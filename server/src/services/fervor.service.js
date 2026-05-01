import * as repo from '../models/repository.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';

/**
 * 获取 AI 狂热值信息
 */
export async function getFervorInfo(userId) {
  const profile = await repo.findOne('ai_profiles', { userId });
  if (!profile) throw new NotFoundError('AI档案不存在');

  return {
    userId,
    fervorScore: profile.fervorScore ?? 50,
    fervorLevel: profile.fervorLevel ?? 2,
    fervorUpdatedAt: profile.fervorUpdatedAt ?? null,
  };
}

/**
 * 管理员手动设置狂热值
 */
export async function updateFervor(userId, score, level) {
  const profile = await repo.findOne('ai_profiles', { userId });
  if (!profile) throw new NotFoundError('AI档案不存在');

  // 自动映射等级（若未指定）
  const computedLevel = level ?? scoreToLevel(score);

  await repo.update('ai_profiles', profile.id, {
    fervorScore: score,
    fervorLevel: computedLevel,
    fervorUpdatedAt: new Date().toISOString(),
  });

  return { success: true, fervorScore: score, fervorLevel: computedLevel };
}

/**
 * 分数→等级映射
 */
function scoreToLevel(score) {
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}
