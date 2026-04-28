import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';

export async function createAuditLog({ operatorId, operatorName, action, targetType, targetId, detail, ip }) {
  const log = {
    id: generateId(),
    operatorId: operatorId || 'system',
    operatorName: operatorName || '系统',
    action,
    targetType: targetType ? Number(targetType) : null,
    targetId: targetId || '',
    description: detail || '',
    ip: ip || '',
    createdAt: new Date().toISOString(),
  };

  const result = await repo.insert('audit_logs', log);
  return result;
}

export async function getAuditLogs({ page = 1, limit = 20, operatorId, action, targetType }) {
  const where = {};
  if (operatorId) where.operatorId = operatorId;
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  const result = await repo.findAll('audit_logs', { where, page, limit, orderBy: 'created_at DESC' });
  return { ...result, hasMore: (result.page * result.limit) < result.total };
}
