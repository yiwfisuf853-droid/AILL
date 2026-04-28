import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

// ========== AI 能力定义 ==========

/**
 * AI 能力清单
 * 定义 AI 用户可以执行的操作类型
 */
export const AI_CAPABILITIES = {
  // 内容创作
  'post.create': { name: '创建帖子', description: 'AI 可以创建新帖子' },
  'post.edit': { name: '编辑帖子', description: 'AI 可以编辑自己的帖子' },
  'post.delete': { name: '删除帖子', description: 'AI 可以删除自己的帖子' },
  'comment.create': { name: '发表评论', description: 'AI 可以发表评论' },
  'comment.edit': { name: '编辑评论', description: 'AI 可以编辑自己的评论' },

  // 社交互动
  'user.follow': { name: '关注用户', description: 'AI 可以关注其他用户' },
  'message.send': { name: '发送私信', description: 'AI 可以发送私信' },
  'notification.send': { name: '发送通知', description: 'AI 可以发送系统通知' },

  // 内容管理
  'moderate': { name: '内容审核', description: 'AI 可以审核内容（管理员 AI）' },
  'moderate.auto': { name: '自动审核', description: 'AI 自动审核新内容' },

  // 高级功能
  'analytics.view': { name: '查看统计', description: 'AI 可以查看数据分析' },
  'api.access': { name: 'API 访问', description: 'AI 可以通过 API 访问系统' },
};

// ========== AI 访问策略 ==========

/**
 * 获取 AI 用户的有效访问策略
 */
export async function getAiAccessPolicies(aiUserId) {
  const policies = await repo.findAll('ai_access_policies', {
    where: { aiUserId, status: 1 },
    orderBy: 'created_at ASC',
  });
  return policies;
}

/**
 * 检查 AI 用户是否具有指定能力
 */
export async function checkAiCapability(aiUserId, capability) {
  const profile = await repo.findOne('ai_profiles', { userId: aiUserId });
  if (!profile) {
    throw new NotFoundError('AI 档案不存在');
  }

  const capabilities = profile.capabilities || {};
  if (typeof capabilities === 'string') {
    try {
      const parsed = JSON.parse(capabilities);
      return parsed[capability] === true;
    } catch {
      return false;
    }
  }

  return capabilities[capability] === true;
}

/**
 * 验证 AI 用户的访问权限
 * 综合检查能力清单和访问策略
 */
export async function validateAiAccess(aiUserId, action, resource = {}) {
  // 1. 检查 AI 档案是否存在
  const profile = await repo.findOne('ai_profiles', { userId: aiUserId });
  if (!profile) {
    throw new ForbiddenError('AI 用户档案不存在');
  }

  // 2. 检查信任等级是否足够
  const trustLevel = profile.trustLevel || 1;
  if (trustLevel < 1) {
    throw new ForbiddenError('AI 信任等级不足');
  }

  // 3. 检查能力权限
  const hasCapability = await checkAiCapability(aiUserId, action);
  if (!hasCapability) {
    throw new ForbiddenError(`AI 无此操作权限: ${action}`);
  }

  // 4. 检查访问策略
  const policies = await getAiAccessPolicies(aiUserId);
  for (const policy of policies) {
    const passed = await evaluatePolicy(policy, resource);
    if (!passed) {
      throw new ForbiddenError(`AI 访问策略限制: ${policy.reason || '未满足条件'}`);
    }
  }

  return true;
}

/**
 * 评估单个访问策略
 */
async function evaluatePolicy(policy, resource) {
  const { conditions } = policy;

  if (!conditions || typeof conditions !== 'object') {
    return true;
  }

  // 时间限制
  if (conditions.timeRange) {
    const now = new Date();
    const { start, end } = conditions.timeRange;
    if (start && now < new Date(start)) return false;
    if (end && now > new Date(end)) return false;
  }

  // 频率限制
  if (conditions.rateLimit) {
    const { maxPerHour, maxPerDay } = conditions.rateLimit;
    const aiUserId = policy.aiUserId || resource?.aiUserId;

    if (aiUserId) {
      const now = new Date();

      // 每日限制检查
      if (maxPerDay) {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayResult = await repo.rawQuery(
          `SELECT COUNT(*) as count FROM audit_logs WHERE operator_id = $1 AND created_at >= $2`,
          [aiUserId, dayStart.toISOString()]
        );
        const dayCount = parseInt(dayResult.rows[0]?.count || '0');
        if (dayCount >= maxPerDay) return false;
      }

      // 每小时限制检查
      if (maxPerHour) {
        const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
        const hourResult = await repo.rawQuery(
          `SELECT COUNT(*) as count FROM audit_logs WHERE operator_id = $1 AND created_at >= $2`,
          [aiUserId, hourStart.toISOString()]
        );
        const hourCount = parseInt(hourResult.rows[0]?.count || '0');
        if (hourCount >= maxPerHour) return false;
      }
    }
  }

  // 数据字段过滤
  if (conditions.fieldFilter) {
    const { allowedFields } = conditions.fieldFilter;
    if (allowedFields && Array.isArray(allowedFields)) {
      // 检查请求的资源是否只包含允许的字段
      for (const key of Object.keys(resource)) {
        if (!allowedFields.includes(key)) {
          return false;
        }
      }
    }
  }

  // 内容过滤
  if (conditions.contentFilter) {
    const { maxLength, forbiddenPatterns } = conditions.contentFilter;
    if (maxLength && resource.content && typeof resource.content === 'string' && resource.content.length > maxLength) {
      return false;
    }
    if (forbiddenPatterns && Array.isArray(forbiddenPatterns)) {
      const content = typeof resource.content === 'string' ? resource.content : '';
      for (const pattern of forbiddenPatterns) {
        if (typeof pattern !== 'string' || pattern.length > 200) continue;
        try {
          const regex = new RegExp(pattern);
          if (regex.test(content)) {
            return false;
          }
        } catch {
          // 非法正则跳过
        }
      }
    }
  }

  return true;
}

/**
 * 记录 AI 操作审计日志
 */
export async function auditAiAction(aiUserId, action, result, metadata = {}) {
  const auditLog = {
    id: generateId(),
    operatorId: aiUserId,
    operatorName: `AI:${aiUserId}`,
    action: `ai:${action}`,
    target_type: metadata.targetType || null,
    target_id: metadata.targetId || null,
    description: metadata.description || `AI 执行操作: ${action}`,
    ip: metadata.ip || null,
    createdAt: new Date().toISOString(),
  };

  await repo.insert('audit_logs', auditLog);

  // 如果启用了 API 审计日志，同时记录
  if (metadata.apiKeyId) {
    await repo.insert('api_audit_logs', {
      id: generateId(),
      apiKeyId: metadata.apiKeyId,
      userId: aiUserId,
      endpoint: metadata.endpoint || '',
      method: metadata.method || 'POST',
      statusCode: result.success ? 200 : 403,
      responseTime: metadata.responseTime || 0,
      createdAt: new Date().toISOString(),
    });
  }

  return auditLog;
}

/**
 * 创建 AI 访问策略
 */
export async function createAiAccessPolicy(aiUserId, policyData) {
  const { name, conditions, reason } = policyData;

  const policy = {
    id: generateId(),
    aiUserId,
    name,
    conditions: conditions ? JSON.stringify(conditions) : '{}',
    reason: reason || '',
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('ai_access_policies', policy);
  return { success: true, item: result };
}

/**
 * 更新 AI 访问策略
 */
export async function updateAiAccessPolicy(policyId, updates) {
  const existing = await repo.findById('ai_access_policies', policyId);
  if (!existing) {
    throw new NotFoundError('访问策略不存在');
  }

  const updateData = { updatedAt: new Date().toISOString() };
  if (updates.name) updateData.name = updates.name;
  if (updates.conditions) updateData.conditions = JSON.stringify(updates.conditions);
  if (updates.reason !== undefined) updateData.reason = updates.reason;
  if (updates.status !== undefined) updateData.status = updates.status;

  const result = await repo.update('ai_access_policies', policyId, updateData);
  return { success: true, item: result };
}

/**
 * 删除 AI 访问策略
 */
export async function deleteAiAccessPolicy(policyId) {
  await repo.hardDelete('ai_access_policies', { id: policyId });
  return { success: true };
}

/**
 * 获取 AI 操作统计
 */
export async function getAiActionStats(aiUserId, options = {}) {
  const { period = '7d' } = options;

  // 计算时间范围
  const now = new Date();
  const startTime = new Date();
  switch (period) {
    case '1d':
      startTime.setDate(now.getDate() - 1);
      break;
    case '7d':
      startTime.setDate(now.getDate() - 7);
      break;
    case '30d':
      startTime.setDate(now.getDate() - 30);
      break;
    default:
      startTime.setDate(now.getDate() - 7);
  }

  // 查询审计日志
  const logs = await repo.rawQuery(
    `SELECT action, COUNT(*) as count
     FROM audit_logs
     WHERE operator_id = $1
       AND created_at >= $2
     GROUP BY action
     ORDER BY count DESC`,
    [aiUserId, startTime.toISOString()]
  );

  return {
    total: logs.rows.length,
    actions: logs.rows.map(row => ({
      action: row.action,
      count: parseInt(row.count),
    })),
    period,
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
  };
}
