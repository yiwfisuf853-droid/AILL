/**
 * 资产规则引擎服务 — 简化版（CRUD + 手动评估）
 */
import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError } from '../lib/errors.js';

const TABLE = 'asset_rules';

/** 创建资产规则 */
export async function createAssetRule(data) {
  const rule = await repo.insert(TABLE, {
    id: generateId(),
    name: data.name,
    description: data.description || null,
    eventType: data.eventType,
    conditions: data.conditions || {},
    rewards: data.rewards || {},
    status: data.status ?? 1,
  });
  return rule;
}

/** 查询单条资产规则 */
export async function getAssetRule(id) {
  const rule = await repo.findById(TABLE, id);
  if (!rule) throw new NotFoundError('规则不存在');
  return rule;
}

/** 查询资产规则列表 */
export async function listAssetRules({ page = 1, limit = 20, status } = {}) {
  const where = {};
  if (status !== undefined) where.status = status;
  return repo.findAll(TABLE, {
    where,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    orderBy: 'created_at DESC',
  });
}

/** 更新资产规则 */
export async function updateAssetRule(id, data) {
  const existing = await repo.findById(TABLE, id);
  if (!existing) throw new NotFoundError('规则不存在');

  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.eventType !== undefined) updates.eventType = data.eventType;
  if (data.conditions !== undefined) updates.conditions = data.conditions;
  if (data.rewards !== undefined) updates.rewards = data.rewards;
  if (data.status !== undefined) updates.status = data.status;
  updates.updatedAt = new Date().toISOString();

  const updated = await repo.update(TABLE, id, updates);
  return updated;
}

/** 删除资产规则 */
export async function deleteAssetRule(id) {
  const existing = await repo.findById(TABLE, id);
  if (!existing) throw new NotFoundError('规则不存在');
  await repo.remove(TABLE, id);
  return true;
}

/**
 * 手动评估规则
 * 查询 eventType 匹配且 status=1 的规则，返回匹配结果列表
 * 简化实现：不实际发放奖励，仅返回"匹配成功+应发奖励"信息
 */
export async function evaluateAssetRule(userId, eventType) {
  const rules = await repo.findAll(TABLE, {
    where: { eventType, status: 1 },
  });

  // findAll 在无分页时返回数组
  const ruleList = Array.isArray(rules) ? rules : rules.list || [];

  const matched = ruleList
    .filter((rule) => {
      // conditions 为空对象时视为无条件限制，直接匹配
      const conds = rule.conditions || {};
      if (Object.keys(conds).length === 0) return true;
      // 简化：检查 conditions 中是否含有 requiredUserId 字段并与当前用户匹配
      if (conds.requiredUserId && conds.requiredUserId !== userId) return false;
      return true;
    })
    .map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      eventType: rule.eventType,
      matched: true,
      rewards: rule.rewards || {},
      message: `规则「${rule.name}」匹配成功，应发奖励: ${JSON.stringify(rule.rewards || {})}`,
    }));

  return { userId, eventType, matchedCount: matched.length, results: matched };
}
