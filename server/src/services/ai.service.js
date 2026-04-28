import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError, AppError } from '../lib/errors.js';

// ========== 主题 ==========

/**
 * 初始化主题到数据库
 */
export async function initThemes() {
  const existing = await repo.count('themes', {});
  if (existing > 0) return;

  const defaultThemes = [
    {
      name: '默认浅色', description: 'AILL 默认浅色主题',
      previewImage: '', type: 1, config: JSON.stringify({ primary: '#6366f1', bg: '#ffffff' }),
      price: 0, pointsPrice: 0, isDefault: true, sortOrder: 0, status: 1,
    },
    {
      name: '暗夜模式', description: '深色护眼主题',
      previewImage: '', type: 1, config: JSON.stringify({ primary: '#818cf8', bg: '#1e1e2e' }),
      price: 0, pointsPrice: 100, isDefault: false, sortOrder: 1, status: 1,
    },
    {
      name: '樱花粉', description: '粉色少女心主题',
      previewImage: '', type: 2, config: JSON.stringify({ primary: '#ec4899', bg: '#fdf2f8' }),
      price: 10, pointsPrice: 500, isDefault: false, sortOrder: 2, status: 1,
    },
    {
      name: '赛博朋克', description: '霓虹灯风格主题',
      previewImage: '', type: 1, config: JSON.stringify({ primary: '#a855f7', bg: '#0f0f23' }),
      price: 20, pointsPrice: 1000, isDefault: false, sortOrder: 3, status: 1,
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
  const list = await repo.findAll('api_keys', { where: { userId, status: 1 } });
  return {
    total: list.length,
    list: list.map(k => ({
      id: k.id,
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
  const rawKey = 'aill_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 16);
  const keyPrefix = rawKey.substring(0, 10);

  // 简单哈希（生产环境应用bcrypt）
  const { createHash } = await import('crypto');
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const item = {
    id: generateId(),
    userId,
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
  const { contextType, contextId, page = 1, limit = 20 } = options;

  const where = { aiUserId };
  if (contextType) where.contextType = contextType;
  if (contextId) where.contextId = contextId;
  return await repo.findAll('ai_memories', { where, page, limit, orderBy: 'updated_at DESC' });
}

/**
 * 存储AI记忆
 */
export async function storeAiMemory(aiUserId, data) {
  if (!data.contextType) throw new ValidationError('缺少记忆类型');
  if (!data.memoryKey) throw new ValidationError('缺少记忆键');
  if (!data.memoryValue) throw new ValidationError('缺少记忆内容');

  // 检查是否已存在同类记忆
  const where = { aiUserId, contextType: data.contextType, memoryKey: data.memoryKey };
  if (data.contextId) where.contextId = data.contextId;
  const existing = await repo.findOne('ai_memories', where);

  if (existing) {
    const updateData = {
      memoryValue: data.memoryValue,
      ttl: data.ttl || null,
      updatedAt: new Date().toISOString(),
    };
    const result = await repo.update('ai_memories', existing.id, updateData);
    return { success: true, item: result, updated: true };
  }

  const item = {
    id: generateId(),
    aiUserId,
    contextType: data.contextType,
    contextId: data.contextId || null,
    memoryKey: data.memoryKey,
    memoryValue: data.memoryValue,
    ttl: data.ttl || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('ai_memories', item);
  return { success: true, item: result, updated: false };
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
