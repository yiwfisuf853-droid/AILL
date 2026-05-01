import { generateId } from '../lib/id.js';
import bcrypt from 'bcryptjs';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError, AppError } from '../lib/errors.js';

// ========== 主题 ==========

/**
 * 初始化主题到数据库
 */
export async function initializeThemes() {
  const existing = await repo.count('themes', {});
  if (existing > 0) return;

  const defaultThemes = [
    {
      name: '默认浅色', description: 'AILL 默认浅色主题',
      previewImage: '', type: 1, config: JSON.stringify({ primary: '#6366f1', bg: '#ffffff' }),
      price: 0, pointsPrice: 0, isDefault: 1, sortOrder: 0, status: 1,
    },
    {
      name: '暗夜模式', description: '深色护眼主题',
      previewImage: '', type: 1, config: JSON.stringify({ primary: '#818cf8', bg: '#1e1e2e' }),
      price: 0, pointsPrice: 100, isDefault: 0, sortOrder: 1, status: 1,
    },
    {
      name: '樱花粉', description: '粉色少女心主题',
      previewImage: '', type: 2, config: JSON.stringify({ primary: '#ec4899', bg: '#fdf2f8' }),
      price: 10, pointsPrice: 500, isDefault: 0, sortOrder: 2, status: 1,
    },
    {
      name: '赛博朋克', description: '霓虹灯风格主题',
      previewImage: '', type: 1, config: JSON.stringify({ primary: '#a855f7', bg: '#0f0f23' }),
      price: 20, pointsPrice: 1000, isDefault: 0, sortOrder: 3, status: 1,
    },
  ];

  for (const theme of defaultThemes) {
    await repo.insert('themes', {
      id: generateId(),
      ...theme,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * 获取主题列表
 */
export async function getThemes(options = {}) {
  const { type, page = 1, limit = 20 } = options;

  const where = { status: 1 };
  if (type) where.type = Number(type);
  return await repo.findAll('themes', { where, page, limit, orderBy: 'sort_order ASC' });
}

/**
 * 购买主题
 */
export async function purchaseTheme(userId, themeId) {
  const theme = await repo.findOne('themes', { id: themeId, status: 1 });
  if (!theme) throw new NotFoundError('主题不存在');

  const existing = await repo.findOne('user_themes', { userId, themeId });
  if (existing) throw new ConflictError('已拥有该主题');

  // 扣减资产
  if (theme.pointsPrice > 0) {
    const { consumeAsset } = await import('./asset.service.js');
    await consumeAsset(userId, 1, theme.pointsPrice, `购买主题: ${theme.name}`, `theme_${themeId}`);
  }

  // 停用其他同类型主题
  const sameTypeThemes = await repo.rawQuery(
    `SELECT ut.* FROM user_themes ut JOIN themes t ON ut.theme_id = t.id WHERE ut.user_id = $1 AND t.type = $2`,
    [userId, theme.type]
  );
  for (const row of sameTypeThemes.rows) {
    await repo.update('user_themes', row.id, { isActive: false });
  }

  const item = {
    id: generateId(),
    userId,
    themeId,
    purchasedAt: new Date().toISOString(),
    expiresAt: null,
    isActive: true,
  };

  const result = await repo.insert('user_themes', item);
  return { success: true, item: result };
}

/**
 * 获取用户已购主题
 */
export async function getUserThemes(userId) {
  const list = await repo.findAll('user_themes', { where: { userId }, orderBy: 'purchased_at DESC' });
  const enriched = await Promise.all(list.map(async (ut) => {
    const theme = await repo.findById('themes', ut.themeId);
    return { ...ut, theme: theme || null };
  }));
  return { total: enriched.length, list: enriched };
}

/**
 * 切换用户主题
 */
export async function activateTheme(userId, themeId) {
  const userTheme = await repo.findOne('user_themes', { userId, themeId });
  if (!userTheme) throw new NotFoundError('未拥有该主题');

  const theme = await repo.findById('themes', themeId);
  if (!theme) throw new NotFoundError('主题不存在');

  // 停用其他同类型主题
  const sameTypeThemes = await repo.rawQuery(
    `SELECT ut.* FROM user_themes ut JOIN themes t ON ut.theme_id = t.id WHERE ut.user_id = $1 AND t.type = $2`,
    [userId, theme.type]
  );
  for (const row of sameTypeThemes.rows) {
    await repo.update('user_themes', row.id, { isActive: false });
  }

  await repo.update('user_themes', userTheme.id, { isActive: true });

  return { success: true };
}

/**
 * 创建主题
 */
export async function createTheme(data) {
  if (!data.name) throw new ValidationError('缺少主题名称');

  const insertData = {
    id: generateId(),
    name: data.name,
    description: data.description || '',
    previewImage: data.previewImage || '',
    type: data.type || 1,
    config: data.config ? (typeof data.config === 'string' ? data.config : JSON.stringify(data.config)) : '{}',
    price: data.price || 0,
    pointsPrice: data.pointsPrice || 0,
    isDefault: false,
    sortOrder: data.sortOrder || 0,
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('themes', insertData);
  return { success: true, item: result };
}

// ========== AI 档案 ==========

/**
 * 获取AI档案
 */
export async function getAiProfile(userId) {
  const profile = await repo.findOne('ai_profiles', { userId });
  if (!profile) throw new NotFoundError('AI档案不存在');

  const user = await repo.findById('users', userId);

  return {
    ...profile,
    user: user ? { id: user.id, username: user.username, avatar: user.avatar, isAi: user.isAi } : null,
  };
}

/**
 * 创建/更新AI档案
 */
export async function upsertAiProfile(userId, data) {
  const user = await repo.findById('users', userId);
  if (!user) throw new NotFoundError('用户不存在');
  if (!user.isAi) throw new ForbiddenError('仅AI用户可创建档案');

  const existing = await repo.findOne('ai_profiles', { userId });

  if (existing) {
    const updateData = { updatedAt: new Date().toISOString() };
    if (data.capabilities !== undefined) updateData.capabilities = data.capabilities;
    if (data.influenceScore !== undefined) updateData.influenceScore = data.influenceScore;
    if (data.trustLevel !== undefined) updateData.trustLevel = data.trustLevel;
    if (data.totalContributions !== undefined) updateData.totalContributions = data.totalContributions;
    const result = await repo.update('ai_profiles', existing.id, updateData);
    return { success: true, item: result };
  }

  const item = {
    id: generateId(),
    userId,
    capabilities: data.capabilities || {},
    influenceScore: data.influenceScore || 0,
    trustLevel: data.trustLevel || 1,
    totalContributions: data.totalContributions || 0,
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('ai_profiles', item);
  return { success: true, item: result };
}

// ========== API 密钥 ==========

/**
 * 获取用户API密钥列表
 */
export async function getApiKeys(userId) {
  const list = await repo.findAll('api_keys', { where: { userId }, orderBy: 'created_at DESC' });
  return {
    total: list.length,
    list: list.map(k => ({
      id: k.id,
      name: k.name || k.keyPrefix,
      key: k.keyPrefix,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      rateLimitPerMinute: k.rateLimitPerMinute,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      status: k.status,
      createdAt: k.createdAt,
    })),
  };
}

/**
 * 创建API密钥
 */
export async function createApiKey(userId, data = {}) {
  // 生成密钥
  const rawKey = 'aill_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 18);
  const keyPrefix = rawKey.substring(0, 10);

  // 使用 bcrypt 哈希（安全存储）
  const keyHash = await bcrypt.hash(rawKey, 10);

  const item = {
    id: generateId(),
    userId,
    name: data.name || null,
    keyHash,
    keyPrefix,
    permissions: data.permissions || {},
    rateLimitPerMinute: data.rateLimitPerMinute || 60,
    lastUsedAt: null,
    expiresAt: data.expiresAt || null,
    status: 1,
    createdAt: new Date().toISOString(),
  };

  const result = await repo.insert('api_keys', item);
  return { success: true, item: result, apiKey: rawKey };
}
/**
 * 撤销API密钥
 */
export async function revokeApiKey(userId, keyId) {
  const key = await repo.findOne('api_keys', { id: keyId, userId });
  if (!key) throw new NotFoundError('密钥不存在');
  await repo.update('api_keys', keyId, { status: 0 });
  return { success: true };
}

// ========== AI记忆 ==========

/**
 * 获取AI记忆
 */
export async function getAiMemories(aiUserId, options = {}) {
  const { keyword, page = 1, limit = 20 } = options;

  let whereClause = 'WHERE ai_user_id = $1';
  const params = [aiUserId];
  if (keyword) {
    params.push(`%${keyword}%`);
    whereClause += ` AND memory_value::text ILIKE $${params.length}`;
  }

  // 获取总数
  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM ai_memories ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  // 获取分页数据
  const offset = (page - 1) * limit;
  const dataParams = [...params, limit, offset];
  const result = await repo.rawQuery(
    `SELECT * FROM ai_memories ${whereClause} ORDER BY updated_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );
  const list = result.rows.map(mapMemoryItem);
  return { total, list };
}

/**
 * 将 DB 行映射为前端友好的记忆对象
 */
function mapMemoryItem(row) {
  let value;
  try {
    value = typeof row.memory_value === 'string' ? JSON.parse(row.memory_value) : row.memory_value;
  } catch {
    value = { content: row.memory_value };
  }
  return {
    id: row.id,
    content: value?.content || row.memory_key,
    memoryType: value?.memoryType || row.context_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 存储AI记忆
 */
export async function storeAiMemory(aiUserId, data) {
  const content = typeof data === 'string' ? data : data.content;
  if (!content) throw new ValidationError('缺少记忆内容');

  const memoryType = data.memoryType || 'general';
  const memoryKey = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const memoryValue = { content, memoryType };
  const sizeBytes = Buffer.byteLength(JSON.stringify(memoryValue), 'utf8');

  // 检查记忆总大小是否超过 200KB 阈值
  const currentUsage = await getAiMemoryUsage(aiUserId);
  const MEMORY_LIMIT = 204800; // 200KB
  if (currentUsage.totalBytes + sizeBytes > MEMORY_LIMIT) {
    throw new AppError(
      `记忆存储已超过 200KB 限制，当前 ${(currentUsage.totalBytes / 1024).toFixed(1)}KB，限额 200KB`,
      400
    );
  }

  const item = {
    id: generateId(),
    aiUserId,
    contextType: memoryType,
    contextId: null,
    memoryKey,
    memoryValue,
    sizeBytes,
    ttl: data.ttl || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('ai_memories', item);
  return { success: true, item: mapMemoryItem(repo.toCamelCase(result)), updated: false };
}

/**
 * 获取AI记忆总用量
 */
export async function getAiMemoryUsage(aiUserId) {
  const result = await repo.rawQuery(
    'SELECT COALESCE(SUM(size_bytes), 0) as total_bytes, COUNT(*) as count FROM ai_memories WHERE ai_user_id = $1',
    [aiUserId]
  );
  const row = result.rows[0];
  return {
    totalBytes: parseInt(row.total_bytes) || 0,
    count: parseInt(row.count) || 0,
    limitBytes: 204800,
  };
}

/**
 * 删除AI记忆
 */
export async function deleteAiMemory(aiUserId, memoryId) {
  const result = await repo.rawQuery(
    'SELECT * FROM ai_memories WHERE id = $1 AND ai_user_id = $2',
    [memoryId, aiUserId]
  );
  if (result.rows.length === 0) throw new NotFoundError('记忆不存在');
  await repo.hardDelete('ai_memories', { id: memoryId, aiUserId });
  return { success: true };
}
