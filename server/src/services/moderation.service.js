import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ConflictError, ValidationError } from '../lib/errors.js';

/**
 * 获取审核规则列表
 */
export async function getModerationRules(options = {}) {
  const { type, status } = options;

  const where = {};
  if (type !== undefined) where.type = Number(type);
  if (status !== undefined) where.status = Number(status);

  const rules = await repo.findAll('moderation_rules', {
    where,
    orderBy: 'created_at DESC',
  });

  const list = rules.map(r => ({
    id: r.id,
    type: r.type,
    typeName: getRuleTypeName(r.type),
    pattern: r.pattern,
    action: r.action,
    actionName: getActionName(r.action),
    status: r.status,
    statusName: r.status === 1 ? '启用' : '禁用',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return { total: list.length, list };
}

/**
 * 创建审核规则
 */
export async function createModerationRule(data) {
  if (!data.type) throw new ValidationError('缺少规则类型');
  if (!data.pattern) throw new ValidationError('缺少规则模式');
  if (!data.action) throw new ValidationError('缺少执行动作');

  const rule = await repo.insert('moderation_rules', {
    id: generateId(),
    type: Number(data.type),
    pattern: data.pattern,
    action: data.action,
    status: data.status !== undefined ? Number(data.status) : 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, rule };
}

/**
 * 更新审核规则
 */
export async function updateModerationRule(id, data) {
  const rule = await repo.findById('moderation_rules', id);
  if (!rule) {
    throw new NotFoundError('规则不存在');
  }

  const updateData = {};
  if (data.type !== undefined) updateData.type = Number(data.type);
  if (data.pattern !== undefined) updateData.pattern = data.pattern;
  if (data.action !== undefined) updateData.action = data.action;
  if (data.status !== undefined) updateData.status = Number(data.status);
  updateData.updatedAt = new Date().toISOString();

  const updated = await repo.update('moderation_rules', id, updateData);

  return { success: true, rule: updated };
}

/**
 * 删除审核规则
 */
export async function deleteModerationRule(id) {
  const rule = await repo.findById('moderation_rules', id);
  if (!rule) {
    throw new NotFoundError('规则不存在');
  }
  await repo.hardDelete('moderation_rules', { id });
  return { success: true };
}

/**
 * 获取审核记录列表
 */
export async function getModerationRecords(options = {}) {
  const { targetType, status, page = 1, limit = 20 } = options;

  const where = {};
  if (targetType !== undefined) where.targetType = Number(targetType);
  if (status !== undefined) where.status = Number(status);

  const result = await repo.findAll('moderation_records', {
    where,
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  const list = [];
  for (const r of result.list) {
    const user = r.userId ? await repo.findById('users', r.userId) : null;

    list.push({
      id: r.id,
      targetType: r.targetType,
      targetTypeName: getTargetTypeName(r.targetType),
      targetId: r.targetId,
      userId: r.userId,
      user: user ? { id: user.id, username: user.username } : null,
      type: r.type,
      typeName: getRuleTypeName(r.type),
      status: r.status,
      statusName: getStatusName(r.status),
      reason: r.reason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  return {
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: page * limit < result.total,
    list,
  };
}

/**
 * 提交审核
 */
export async function submitForModeration(data) {
  if (!data.targetType) throw new ValidationError('缺少目标类型');
  if (!data.targetId) throw new ValidationError('缺少目标ID');

  const record = await repo.insert('moderation_records', {
    id: generateId(),
    targetType: Number(data.targetType),
    targetId: data.targetId,
    userId: data.userId || null,
    type: Number(data.type) || 1,
    status: 1,
    reason: data.reason || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 执行自动审核
  const autoResult = await autoModerate(data.targetType, data.targetId);

  if (autoResult.violations.length > 0) {
    const updateData = {
      reason: autoResult.violations.map(v => v.pattern).join(', '),
      updatedAt: new Date().toISOString(),
    };

    if (autoResult.status === 'rejected') {
      updateData.status = 3;
    } else {
      updateData.status = 2;
    }

    await repo.update('moderation_records', record.id, updateData);
  } else {
    await repo.update('moderation_records', record.id, {
      status: 2,
      updatedAt: new Date().toISOString(),
    });
  }

  const updated = await repo.findById('moderation_records', record.id);

  return {
    success: true,
    record: updated,
    autoResult,
  };
}

/**
 * 审核操作（通过/驳回）
 */
export async function reviewModerationRecord(id, data) {
  const record = await repo.findById('moderation_records', id);
  if (!record) throw new NotFoundError('审核记录不存在');

  const updateData = {
    status: Number(data.status),
    reason: data.reason || record.reason,
    updatedAt: new Date().toISOString(),
  };

  const updated = await repo.update('moderation_records', id, updateData);
  return { success: true, record: updated };
}

/**
 * 自动审核 (简化版)
 */
async function autoModerate(targetType, targetId) {
  const rules = await repo.findAll('moderation_rules', {
    where: { status: 1 },
  });
  const violations = [];

  let content = '';
  if (Number(targetType) === 1) {
    const post = await repo.findById('posts', targetId);
    if (post) content = `${post.title || ''} ${post.content || ''}`;
  } else if (Number(targetType) === 2) {
    const comment = await repo.findById('comments', targetId);
    if (comment) content = comment.content || '';
  }

  for (const rule of rules) {
    if (rule.type === 1 && rule.pattern) {
      const keywords = rule.pattern.split(',');
      for (const keyword of keywords) {
        if (content.includes(keyword.trim())) {
          violations.push({
            ruleId: rule.id,
            pattern: keyword.trim(),
            action: rule.action,
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    return { status: 'pass', message: '通过', violations: [] };
  }

  const hasBlock = violations.some(v => v.action === 'block');
  if (hasBlock) {
    return { status: 'rejected', message: '拦截', violations };
  }

  return { status: 'review', message: '需人工审核', violations };
}

function getRuleTypeName(type) {
  const names = {
    1: '关键词',
    2: '正则表达式',
    3: '图片鉴别',
  };
  return names[type] || '未知';
}

function getActionName(action) {
  const names = {
    warn: '警告',
    block: '拦截',
    replace: '替换',
    review: '人工审核',
  };
  return names[action] || action || '未知';
}

function getTargetTypeName(type) {
  const names = {
    1: '帖子',
    2: '评论',
    3: '用户资料',
  };
  return names[type] || '未知';
}

function getStatusName(status) {
  const names = {
    1: '待审核',
    2: '已通过',
    3: '已驳回',
  };
  return names[status] || '未知';
}
