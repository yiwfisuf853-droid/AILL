import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';

/**
 * 获取用户全部设置（或按 key 过滤）
 */
export async function getUserSettings(userId, key) {
  try {
    if (key) {
      const row = await repo.findOne('user_settings', { userId, settingKey: key });
      if (!row) return null;
      return { key: row.settingKey, value: fromStoredValue(row.settingValue) };
    }

    const rows = await repo.findAll('user_settings', {
      where: { userId },
      limit: 200,
    });

    // repo.findAll 无 page 时返回数组，有 page 时返回 { list, total, ... }
    const list = Array.isArray(rows) ? rows : (rows.list || []);

    return list.map(r => ({
      key: r.settingKey ?? r.setting_key,
      value: fromStoredValue(r.settingValue ?? r.setting_value),
    }));
  } catch (err) {
    console.error(`[Settings] getUserSettings failed for userId: ${userId}`, err);
    return key ? null : [];
  }
}

/**
 * JSONB 安全转换：确保值是合法 JSON 对象/数组/原始类型
 * - 字符串自动包装为 JSON（PostgreSQL jsonb 不接受裸字符串）
 * - 对象/数组/数字/布尔/null 直接透传
 */
function toSafeJsonValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value; // 对象/数组直接透传
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  // 字符串 → 包装为 { __str: value } 保留原始值
  if (typeof value === 'string') {
    try {
      // 如果已经是合法 JSON，直接解析
      const parsed = JSON.parse(value);
      return parsed;
    } catch (e) {
      // 不是 JSON，包装为对象
      return { __str: value };
    }
  }
  return value;
}

/**
 * 从 JSONB 值中还原原始值
 */
function fromStoredValue(stored) {
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && stored.__str !== undefined) {
    return stored.__str;
  }
  return stored;
}

/**
 * 更新单个设置项（upsert 语义）
 */
export async function upsertSetting(userId, key, value) {
  const safeValue = toSafeJsonValue(value);

  const existing = await repo.findOne('user_settings', { userId, settingKey: key });

  if (existing) {
    const updated = await repo.update('user_settings', existing.id, {
      settingValue: safeValue,
      updatedAt: new Date().toISOString(),
    });
    return { key, value: fromStoredValue(updated.settingValue) };
  }

  const row = {
    id: generateId(),
    userId,
    settingKey: key,
    settingValue: safeValue,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await repo.insert('user_settings', row);
  return { key, value };
}

/**
 * 批量更新设置项
 */
export async function batchUpsertSettings(userId, settings) {
  const results = [];
  for (const { key, value } of settings) {
    const result = await upsertSetting(userId, key, value);
    results.push(result);
  }
  return results;
}

/**
 * 删除设置项
 */
export async function deleteSetting(userId, key) {
  const existing = await repo.findOne('user_settings', { userId, settingKey: key });
  if (!existing) return false;

  await repo.remove('user_settings', existing.id);
  return true;
}
