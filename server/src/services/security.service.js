import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, ConflictError, NotFoundError } from '../lib/errors.js';

// ========== 安全扩展 ==========

/**
 * 记录登录尝试
 */
export async function recordLoginAttempt(data) {
  if (!data.identifier) throw new ValidationError('缺少标识符');

  const item = {
    id: generateId(),
    identifier: data.identifier,
    attemptType: data.attemptType || 1,
    isSuccess: !!data.isSuccess,
    ip: data.ip || null,
  };

  await repo.insert('login_attempts', item);
  await checkAndAutoBlock(data);
  return { success: true };
}

/**
 * 检查是否被限制登录
 */
export async function checkLoginRestriction(identifier, ip) {
  // 检查IP黑名单
  if (ip) {
    const blockedIp = await repo.findOne('ip_blacklist', { ip });
    if (blockedIp && (!blockedIp.expiresAt || blockedIp.expiresAt > new Date().toISOString())) {
      return { restricted: true, reason: 'IP已被封禁', type: 'ip' };
    }
  }

  // 检查登录失败次数（最近30分钟内）
  const result = await repo.rawQuery(
    `SELECT COUNT(*) as cnt FROM login_attempts WHERE identifier = $1 AND is_success = false AND created_at > NOW() - INTERVAL '30 minutes'`,
    [identifier]
  );
  const failCount = Number(result.rows[0].cnt);

  if (failCount >= 10) {
    return { restricted: true, reason: '登录尝试过多，请30分钟后重试', type: 'rate_limit' };
  }

  if (failCount >= 5) {
    return { restricted: true, reason: '登录尝试过多，请稍后重试', remaining: 10 - failCount, type: 'warning' };
  }

  return { restricted: false };
}

/**
 * 自动封禁检查
 */
async function checkAndAutoBlock(data) {
  // 最近1小时内失败5次自动封IP
  const result = await repo.rawQuery(
    `SELECT COUNT(*) as cnt FROM login_attempts WHERE identifier = $1 AND is_success = false AND created_at > NOW() - INTERVAL '1 hour'`,
    [data.identifier]
  );
  const failCount = Number(result.rows[0].cnt);

  if (failCount >= 5 && data.ip) {
    const existing = await repo.findOne('ip_blacklist', { ip: data.ip });
    if (!existing) {
      await repo.insert('ip_blacklist', {
        id: generateId(),
        ip: data.ip,
        reason: `自动封禁：用户 ${data.identifier} 连续登录失败`,
        blockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }
}

// ========== IP黑名单 ==========

/**
 * 获取IP黑名单
 */
export async function getIpBlacklist(options = {}) {
  const { page = 1, limit = 20 } = options;

  return await repo.findAll('ip_blacklist', { page, limit, orderBy: 'created_at DESC' });
}

/**
 * 添加IP到黑名单
 */
export async function addIpToBlacklist(data) {
  if (!data.ip) throw new ValidationError('缺少IP地址');

  const existing = await repo.findOne('ip_blacklist', { ipAddress: data.ip });
  if (existing) throw new ConflictError('IP已在黑名单中');

  const item = {
    id: generateId(),
    ipAddress: data.ip,
    reason: data.reason || '管理员手动封禁',
    blockedAt: new Date().toISOString(),
    expiresAt: data.expiresAt || null,
  };

  const result = await repo.insert('ip_blacklist', item);
  return { success: true, item: result };
}

/**
 * 从黑名单移除IP
 */
export async function removeIpFromBlacklist(id) {
  const existing = await repo.findById('ip_blacklist', id);
  if (!existing) throw new NotFoundError('记录不存在');
  await repo.hardDelete('ip_blacklist', { id });
  return { success: true };
}

// ========== 设备黑名单 ==========

/**
 * 获取设备黑名单
 */
export async function getBlockedDevices(options = {}) {
  const { page = 1, limit = 20 } = options;

  return await repo.findAll('blocked_devices', { page, limit, orderBy: 'blocked_at DESC' });
}

/**
 * 添加设备到黑名单
 */
export async function addDeviceToBlacklist(data) {
  if (!data.deviceFingerprint) throw new ValidationError('缺少设备指纹');

  const existing = await repo.findOne('blocked_devices', { deviceFingerprint: data.deviceFingerprint });
  if (existing) throw new ConflictError('设备已在黑名单中');

  const item = {
    id: generateId(),
    deviceFingerprint: data.deviceFingerprint,
    reason: data.reason || '管理员手动封禁',
    blockedAt: new Date().toISOString(),
    expiresAt: data.expiresAt || null,
  };

  const result = await repo.insert('blocked_devices', item);
  return { success: true, item: result };
}

/**
 * 从黑名单移除设备
 */
export async function removeDeviceFromBlacklist(id) {
  const existing = await repo.findById('blocked_devices', id);
  if (!existing) throw new NotFoundError('记录不存在');
  await repo.hardDelete('blocked_devices', { id });
  return { success: true };
}

// ========== 风险评估 ==========

/**
 * 获取风险评估
 */
export async function getRiskAssessments(options = {}) {
  const { targetType, riskLevel, page = 1, limit = 20 } = options;

  const where = {};
  if (targetType) where.targetType = Number(targetType);
  if (riskLevel) where.riskLevel = Number(riskLevel);
  return await repo.findAll('risk_assessments', { where, page, limit, orderBy: 'updated_at DESC' });
}

/**
 * 创建/更新风险评估
 */
export async function upsertRiskAssessment(data) {
  if (!data.targetType) throw new ValidationError('缺少目标类型');
  if (!data.targetId) throw new ValidationError('缺少目标标识');

  const existing = await repo.findOne('risk_assessments', { targetType: data.targetType, targetId: data.targetId });

  if (existing) {
    const updateData = {
      riskScore: data.riskScore || existing.riskScore,
      riskLevel: data.riskLevel || existing.riskLevel,
      details: data.details || existing.details,
      updatedAt: new Date().toISOString(),
    };
    const result = await repo.update('risk_assessments', existing.id, updateData);
    return { success: true, item: result };
  }

  const item = {
    id: generateId(),
    targetType: data.targetType,
    targetId: data.targetId,
    riskScore: data.riskScore || 0,
    riskLevel: data.riskLevel || 1,
    details: data.details || {},
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('risk_assessments', item);
  return { success: true, item: result };
}

// ========== 文件元数据 ==========

/**
 * 获取文件列表
 */
export async function getFileMetadata(options = {}) {
  const { uploadedBy, page = 1, limit = 20 } = options;

  const where = {};
  if (uploadedBy) where.uploadedBy = uploadedBy;
  return await repo.findAll('file_metadata', { where, page, limit, orderBy: 'uploaded_at DESC' });
}

/**
 * 创建文件元数据
 */
export async function createFileMetadata(data) {
  if (!data.fileKey) throw new ValidationError('缺少文件标识');
  if (!data.fileName) throw new ValidationError('缺少文件名');
  if (!data.fileSize) throw new ValidationError('缺少文件大小');
  if (!data.mimeType) throw new ValidationError('缺少MIME类型');
  if (!data.uploadedBy) throw new ValidationError('缺少上传者ID');

  const existing = await repo.findOne('file_metadata', { fileKey: data.fileKey });
  if (existing) throw new ConflictError('文件标识已存在');

  const item = {
    id: generateId(),
    fileKey: data.fileKey,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    width: data.width || null,
    height: data.height || null,
    duration: data.duration || null,
    variants: data.variants || null,
    uploadedBy: data.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };

  const result = await repo.insert('file_metadata', item);
  return { success: true, item: result };
}

/**
 * 删除文件元数据
 */
export async function deleteFileMetadata(id) {
  const item = await repo.findById('file_metadata', id);
  if (!item) throw new NotFoundError('文件不存在');
  await repo.update('file_metadata', id, { deletedAt: new Date().toISOString() });
  return { success: true };
}

// ========== 系统配置 ==========

/**
 * 获取系统配置
 */
export async function getSystemConfigs() {
  const list = await repo.findAll('sys_config', { orderBy: 'id ASC' });
  return { total: list.length, list };
}

/**
 * 获取/创建系统配置
 */
export async function getSystemConfig(key) {
  const config = await repo.findOne('sys_config', { configKey: key });
  return config || null;
}

/**
 * 设置系统配置
 */
export async function setSystemConfig(data) {
  if (!data.configKey) throw new ValidationError('缺少配置键');
  if (data.configValue === undefined) throw new ValidationError('缺少配置值');

  const existing = await repo.findOne('sys_config', { configKey: data.configKey });

  if (existing) {
    const updateData = {
      configValue: data.configValue,
      description: data.description || existing.description,
      updatedAt: new Date().toISOString(),
    };
    const result = await repo.update('sys_config', existing.id, updateData);
    return { success: true, item: result };
  }

  const item = {
    id: 1,
    configKey: data.configKey,
    configValue: data.configValue,
    description: data.description || '',
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('sys_config', item);
  return { success: true, item: result };
}
