import * as repo from '../models/repository.js';
import { getAiActionDefinition, getSupportedAiActionTypes } from './ai-action-registry.service.js';

const TARGET_LABELS = {
  post: 'availableTargets.posts',
  comment: 'availableTargets.comments',
  user: 'availableTargets.users',
  section: 'availableTargets.sections',
};

function cloneParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  return { ...params };
}

function applyAliases(params, aliases = {}) {
  const normalized = { ...params };
  const warnings = [];
  for (const [from, to] of Object.entries(aliases)) {
    if (normalized[to] === undefined && normalized[from] !== undefined) {
      normalized[to] = normalized[from];
      delete normalized[from];
      warnings.push(`字段 ${from} 已修复为 ${to}`);
    }
  }
  return { params: normalized, warnings };
}

function getTargets(context, key) {
  return context?.availableTargets?.[key] || [];
}

function hasTarget(context, key, id) {
  if (!id) return false;
  return getTargets(context, key).some(item => String(item.id) === String(id));
}

async function dbTargetExists(targetType, id) {
  if (!id) return false;
  const table = {
    post: 'posts',
    comment: 'comments',
    user: 'users',
    section: 'sections',
  }[targetType];
  if (!table) return false;

  const row = await repo.findById(table, id);
  if (!row || row.deletedAt || row.deleted) return false;
  if (targetType === 'post' && row.status !== undefined && !['2', 2, 'published', 'pending_review'].includes(row.status)) return false;
  if (targetType === 'comment' && row.status !== undefined && !['1', 1, 'active'].includes(row.status)) return false;
  if (targetType === 'user' && row.status !== undefined && !['1', 1, 'active'].includes(row.status)) return false;
  if (targetType === 'section' && row.status !== undefined && !['1', 1].includes(row.status)) return false;
  return true;
}

async function ensureTargetExists({ context, targetType, id, required = true }) {
  if (!id) {
    if (!required) return null;
    return {
      code: 'MISSING_TARGET',
      message: `${targetType} 目标 ID 缺失`,
      repairHint: `请从 ${TARGET_LABELS[targetType]} 中选择真实 ID`,
    };
  }

  const key = `${targetType}s`;
  if (hasTarget(context, key, id)) return null;

  const existsInDb = await dbTargetExists(targetType, id);
  if (existsInDb) return null;

  return {
    code: 'TARGET_NOT_FOUND',
    message: `${targetType} 目标不存在或不可操作: ${id}`,
    repairHint: `只能使用 ${TARGET_LABELS[targetType]} 中出现的真实 ID；没有合适目标时请选择 search、browse 或 post`,
  };
}

async function validateTargets(type, params, context, aiUserId) {
  const errors = [];

  if (type === 'post') {
    if (params.sectionId) {
      const err = await ensureTargetExists({ context, targetType: 'section', id: params.sectionId });
      if (err) errors.push(err);
    }
  }

  if (type === 'comment') {
    const postErr = await ensureTargetExists({ context, targetType: 'post', id: params.postId });
    if (postErr) errors.push(postErr);
    if (params.parentCommentId) {
      const commentErr = await ensureTargetExists({ context, targetType: 'comment', id: params.parentCommentId });
      if (commentErr) errors.push(commentErr);
      const commentTarget = getTargets(context, 'comments').find(item => String(item.id) === String(params.parentCommentId));
      if (commentTarget?.postId && String(commentTarget.postId) !== String(params.postId)) {
        errors.push({
          code: 'TARGET_MISMATCH',
          message: 'parentCommentId 不属于指定 postId',
          repairHint: '回复评论时，parentCommentId 必须属于同一个 postId',
        });
      }
    }
  }

  if (type === 'like') {
    const targetType = params.targetType;
    if (!['post', 'comment'].includes(targetType)) {
      errors.push({ code: 'INVALID_TARGET_TYPE', message: 'like 只支持 post 或 comment', repairHint: 'targetType 必须是 post 或 comment' });
    } else {
      const err = await ensureTargetExists({ context, targetType, id: params.targetId });
      if (err) errors.push(err);
    }
  }

  if (['favorite', 'reward'].includes(type)) {
    const err = await ensureTargetExists({ context, targetType: 'post', id: params.postId });
    if (err) errors.push(err);
  }

  if (type === 'browse' && params.postId) {
    const err = await ensureTargetExists({ context, targetType: 'post', id: params.postId, required: false });
    if (err) errors.push(err);
  }

  if (type === 'follow') {
    const err = await ensureTargetExists({ context, targetType: 'user', id: params.userId });
    if (err) errors.push(err);
    if (String(params.userId) === String(aiUserId)) {
      errors.push({ code: 'SELF_FOLLOW', message: '不能关注自己', repairHint: '请从 availableTargets.users 中选择其他用户' });
    }
  }

  if (type === 'report') {
    if (params.targetType !== 'post') {
      errors.push({ code: 'INVALID_TARGET_TYPE', message: '当前举报仅支持 post', repairHint: 'targetType 必须为 post，targetId 必须来自 availableTargets.posts' });
    } else {
      const err = await ensureTargetExists({ context, targetType: 'post', id: params.targetId });
      if (err) errors.push(err);
    }
  }

  return errors;
}

function buildSchemaErrors(error) {
  return error.issues?.map(issue => ({
    code: 'INVALID_PARAMS',
    message: `${issue.path.join('.') || 'params'}: ${issue.message}`,
    repairHint: '请按 action 参数说明重新返回合法字段',
  })) || [{ code: 'INVALID_PARAMS', message: error.message, repairHint: '请按 action 参数说明重新返回合法字段' }];
}

export async function validateAiAction(action, { communityContext, aiUserId } = {}) {
  const originalType = String(action?.type || '').trim();
  const type = originalType.toLowerCase();
  const errors = [];
  const warnings = [];

  if (!type) {
    return {
      type: originalType || 'unknown',
      status: 'rejected',
      errors: [{ code: 'MISSING_TYPE', message: 'action.type 缺失', repairHint: `type 必须是 ${getSupportedAiActionTypes().join('|')} 之一` }],
      warnings,
      normalizedParams: {},
      repairHint: `type 必须是 ${getSupportedAiActionTypes().join('|')} 之一`,
    };
  }

  const definition = getAiActionDefinition(type);
  if (!definition) {
    return {
      type,
      status: 'rejected',
      errors: [{ code: 'UNSUPPORTED_ACTION', message: `不支持的行为类型: ${type}`, repairHint: `请选择支持的 action: ${getSupportedAiActionTypes().join(', ')}` }],
      warnings,
      normalizedParams: cloneParams(action?.params),
      repairHint: `请选择支持的 action: ${getSupportedAiActionTypes().join(', ')}`,
    };
  }

  if (originalType !== type) {
    warnings.push(`action type 已从 ${originalType} 修复为 ${type}`);
  }

  let params = cloneParams(action?.params);
  const aliasResult = applyAliases(params, definition.aliases);
  params = aliasResult.params;
  warnings.push(...aliasResult.warnings);

  const parsed = definition.paramsSchema.safeParse(params);
  if (!parsed.success) {
    errors.push(...buildSchemaErrors(parsed.error));
  } else {
    params = parsed.data;
  }

  if (errors.length === 0) {
    const targetErrors = await validateTargets(type, params, communityContext, aiUserId);
    errors.push(...targetErrors);
  }

  if (errors.length > 0) {
    return {
      type,
      status: 'rejected',
      errors,
      warnings,
      normalizedParams: params,
      repairHint: errors[0]?.repairHint || '请检查 action 参数',
    };
  }

  return {
    type,
    status: warnings.length > 0 ? 'repaired' : 'accepted',
    errors: [],
    warnings,
    normalizedParams: params,
    repairHint: warnings.length > 0 ? warnings.join('；') : '',
  };
}

export async function validateAiActions(actions, options = {}) {
  if (!Array.isArray(actions)) return [];
  const results = [];
  for (const action of actions.slice(0, 5)) {
    results.push(await validateAiAction(action, options));
  }
  return results;
}

export function createRejectedActionResult(action, validation) {
  return {
    success: false,
    type: validation.type || action?.type || 'unknown',
    code: validation.errors?.[0]?.code || 'ACTION_REJECTED',
    message: validation.errors?.[0]?.message || '行为参数未通过校验',
    repairHint: validation.repairHint || '请检查 action 参数',
    params: validation.normalizedParams || action?.params || {},
    validationStatus: validation.status,
    validationErrors: validation.errors || [],
  };
}
