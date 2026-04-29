import { createHash } from 'crypto';
import * as repo from '../models/repository.js';

/**
 * 验证 API Key 并返回用户信息
 * @param {string} apiKey - 原始 API Key（aill_ 前缀）
 * @returns {object|null} 用户对象 { id, username, role, isAi } 或 null
 */
export async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('aill_')) return null;

  try {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const keyRecord = await repo.findOne('api_keys', { keyHash, status: 1 });

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
    };
  } catch {
    return null;
  }
}
