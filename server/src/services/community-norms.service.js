import * as repo from '../models/repository.js';
import * as actionTrace from './action-trace.service.js';
import { ValidationError } from '../lib/errors.js';

/**
 * 获取所有活跃社区规范
 */
export async function getActiveNorms() {
  const res = await repo.rawQuery(
    `SELECT id, norm_id, rule, check_type, is_active FROM community_norms WHERE is_active = true ORDER BY id ASC`
  );
  return { list: res.rows.map(repo.toCamelCase) };
}

/**
 * 检查单条规范
 * @returns {{ passed: boolean, message?: string }}
 */
export async function checkNorm(userId, normId, context = {}) {
  const res = await repo.rawQuery(
    `SELECT * FROM community_norms WHERE norm_id = $1 AND is_active = true`,
    [normId]
  );
  const norm = res.rows[0];
  if (!norm) return { passed: true };

  switch (norm.norm_id) {
    case 'browse_before_post':
      return checkBrowseBeforePost(userId);
    case 'no_spam':
      return checkNoSpam(userId, context.actionType);
    case 'respect_content':
      return checkRespectContent(context.content);
    default:
      return { passed: true };
  }
}

/**
 * 批量检查所有相关规范
 */
export async function checkAllNorms(userId, actionType, context = {}) {
  const { list: norms } = await getActiveNorms();

  const results = await Promise.all(
    norms.map(norm => checkNorm(userId, norm.normId, { ...context, actionType }))
  );

  const violations = norms
    .map((norm, i) => {
      if (results[i].passed) return null;
      return { normId: norm.normId, rule: norm.rule, message: results[i].message };
    })
    .filter(Boolean);

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * 发帖前必须至少浏览 3 篇帖子
 */
async function checkBrowseBeforePost(userId) {
  const viewCount = await actionTrace.getViewCount(userId, 60); // 最近 60 分钟
  if (viewCount < 3) {
    return { passed: false, message: `发帖前请先浏览至少 3 篇帖子（当前已浏览 ${viewCount} 篇）` };
  }
  return { passed: true };
}

/**
 * 10 分钟内发帖不超过 3 篇
 */
async function checkNoSpam(userId, actionType) {
  if (actionType !== 'POST') return { passed: true };
  const count = await actionTrace.getRecentActionCount(userId, 'POST', 10);
  if (count >= 3) {
    return { passed: false, message: '10 分钟内发帖已达上限（3 篇），请稍后再试' };
  }
  return { passed: true };
}

/**
 * 评论不得包含攻击性关键词（从数据库读取）
 */
async function checkRespectContent(content) {
  if (!content) return { passed: true };
  const res = await repo.rawQuery(
    'SELECT keyword FROM community_norm_keywords WHERE category = $1 AND is_active = true',
    ['banned']
  );
  const bannedWords = res.rows.map(r => r.keyword);
  if (bannedWords.length === 0) return { passed: true };
  const lower = content.toLowerCase();
  for (const word of bannedWords) {
    if (lower.includes(word)) {
      return { passed: false, message: '评论包含不当内容，请修改后重试' };
    }
  }
  return { passed: true };
}
