import * as repo from '../models/repository.js';
import { default as bcrypt } from 'bcryptjs';
import { generateId } from '../lib/id.js';

/**
 * 记录 API 审计日志（异步，不阻塞请求）
 */
function recordApiAuditLog({ userId, apiKeyId, endpoint, method, requestParams, responseStatus, durationMs }) {
  const log = {
    id: generateId(),
    userId,
    apiKeyId: apiKeyId || null,
    endpoint,
    method,
    requestParams: requestParams || null,
    responseStatus,
    durationMs: durationMs || null,
    createdAt: new Date().toISOString(),
  };

  repo.insert('api_audit_logs', log).catch(err => {
    console.error('[API审计] 记录失败:', err.message);
  });
}

/**
 * 验证 API Key 并返回用户信息
 * @param {string} apiKey - 原始 API Key（aill_ 前缀）
 * @returns {object|null} 用户对象 { id, username, role, isAi, apiKeyId } 或 null
 */
export async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('aill_')) return null;

  try {
    // 获取 keyPrefix 用于快速查找
    const keyPrefix = apiKey.substring(0, 10);
    const keyRecords = await repo.findAll('api_keys', { where: { keyPrefix, status: 1 } });

    if (!keyRecords.length) return null;

    // 遍历匹配的记录，使用 bcrypt 验证
    let keyRecord = null;
    for (const record of keyRecords) {
      const isValid = await bcrypt.compare(apiKey, record.keyHash);
      if (isValid) {
        keyRecord = record;
        break;
      }
    }

    if (!keyRecord) return null;

    // 检查过期
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return null;
    }

    // 查询用户
    const user = await repo.findById('users', keyRecord.userId);
    if (!user || user.deletedAt) return null;

    // 异步更新最后使用时间
    repo.update('api_keys', keyRecord.id, {
      lastUsedAt: new Date().toISOString(),
    }).catch(() => {});

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isAi: user.isAi,
      apiKeyId: keyRecord.id,  // 返回 keyId 用于审计
    };
  } catch {
    return null;
  }
}

/**
 * API Key 认证中间件
 */
export async function apikeyAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const apiKey = authHeader.substring(7);
  if (!apiKey.startsWith('aill_')) {
    return next();
  }

  const startTime = Date.now();
  const user = await validateApiKey(apiKey);

  if (user) {
    req.user = user;
    req.authType = 'apikey';

    // 响应结束后记录审计日志
    const originalEnd = res.end;
    res.end = function(...args) {
      const durationMs = Date.now() - startTime;
      recordApiAuditLog({
        userId: user.id,
        apiKeyId: user.apiKeyId,
        endpoint: req.path,
        method: req.method,
        requestParams: { query: req.query, body: req.body },
        responseStatus: res.statusCode,
        durationMs,
      });
      return originalEnd.apply(this, args);
    };
  }

  next();
}

// 导出审计日志记录函数供其他模块使用
export { recordApiAuditLog };
