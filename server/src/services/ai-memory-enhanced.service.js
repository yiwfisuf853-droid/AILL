/**
 * AI 记忆增强服务
 * 在现有 ai_memories 基础上增加：检索记忆、上下文关联记忆、记忆整合
 * 集成到活跃循环 prompt 中，让 AI 行为受历史记忆影响
 */
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

/**
 * 检索 AI 记忆（关键词 + 类型过滤）
 * @param {string} aiUserId
 * @param {object} options - { keyword, memoryType, limit, minImportance }
 * @returns {Promise<{ total: number, list: Array }>}
 */
export async function searchMemories(aiUserId, options = {}) {
  const { keyword, memoryType, limit = 20, minImportance } = options;

  const conditions = ['m.ai_user_id = $1'];
  const params = [aiUserId];
  let idx = 2;

  if (keyword) {
    params.push(`%${keyword}%`);
    conditions.push(`(m.memory_value::text ILIKE $${idx} OR m.context_type ILIKE $${idx})`);
    idx++;
  }

  if (memoryType) {
    params.push(memoryType);
    conditions.push(`m.context_type = $${idx}`);
    idx++;
  }

  if (minImportance !== undefined) {
    params.push(Number(minImportance));
    conditions.push(`(m.memory_value->>'importance')::float >= $${idx}`);
    idx++;
  }

  const whereClause = conditions.join(' AND ');

  // 总数
  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM ai_memories m WHERE ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  // 分页数据
  params.push(Number(limit));
  const result = await repo.rawQuery(
    `SELECT m.* FROM ai_memories m WHERE ${whereClause}
     ORDER BY m.created_at DESC LIMIT $${idx}`,
    params
  );

  const list = result.rows.map(mapMemoryRow);
  return { total, list };
}

/**
 * 获取与当前上下文相关的记忆
 * 用于活跃循环注入：根据 AI 当前行为上下文检索相关记忆
 * @param {string} aiUserId
 * @param {object} currentContext - { actionType, targetId, keywords }
 * @param {number} [limit=5]
 * @returns {Promise<Array>}
 */
export async function getContextualMemories(aiUserId, currentContext = {}, limit = 5) {
  const { actionType, targetId, keywords } = currentContext;

  const conditions = ['m.ai_user_id = $1'];
  const params = [aiUserId];
  let idx = 2;

  // 按上下文类型匹配
  if (actionType) {
    const typeMap = {
      post: 'interaction',
      comment: 'interaction',
      like: 'preference',
      favorite: 'preference',
      follow: 'preference',
      search: 'insight',
      browse: 'context',
    };
    const mappedType = typeMap[actionType] || 'general';
    params.push(mappedType);
    conditions.push(`(m.context_type = $${idx} OR m.context_type = 'general')`);
    idx++;
  }

  // 按目标 ID 匹配
  if (targetId) {
    params.push(`%${targetId}%`);
    conditions.push(`m.memory_value::text ILIKE $${idx}`);
    idx++;
  }

  // 按关键词匹配
  if (keywords && Array.isArray(keywords) && keywords.length > 0) {
    const keywordConditions = keywords.map(kw => {
      params.push(`%${kw}%`);
      return `m.memory_value::text ILIKE $${idx++}`;
    });
    conditions.push(`(${keywordConditions.join(' OR ')})`);
  }

  const whereClause = conditions.join(' AND ');
  params.push(Number(limit));

  const result = await repo.rawQuery(
    `SELECT m.* FROM ai_memories m WHERE ${whereClause}
     ORDER BY m.created_at DESC LIMIT $${idx}`,
    params
  );

  const relevantMemories = result.rows.map(mapMemoryRow);

  // 在返回结果之前，增强被引用记忆的 importance
  for (const mem of relevantMemories) {
    touchMemory(mem.id).catch(() => {});
  }

  return relevantMemories;
}

/**
 * 记忆整合：将相似记忆合并，降低冗余
 * 定时任务调用，或手动触发
 * @param {string} aiUserId
 * @returns {Promise<{ consolidated: number }>}
 */
export async function consolidateMemories(aiUserId) {
  // 1. 找出同一 context_type 下内容高度相似的记忆
  const memories = await repo.rawQuery(
    `SELECT id, context_type, memory_value, memory_key, created_at
     FROM ai_memories
     WHERE ai_user_id = $1
     ORDER BY context_type, created_at DESC`,
    [aiUserId]
  );

  if (memories.rows.length <= 1) {
    return { consolidated: 0 };
  }

  // 2. 按类型分组，找出同类型中内容完全重复的记忆
  const byType = {};
  for (const row of memories.rows) {
    const type = row.context_type || 'general';
    if (!byType[type]) byType[type] = [];
    byType[type].push(row);
  }

  let consolidated = 0;
  const seenContents = new Set();

  for (const [type, items] of Object.entries(byType)) {
    for (const item of items) {
      try {
        const value = typeof item.memory_value === 'string'
          ? JSON.parse(item.memory_value)
          : item.memory_value;
        const contentKey = String(value?.content || '').trim().toLowerCase();

        if (!contentKey || contentKey.length < 5) continue;

        if (seenContents.has(contentKey)) {
          // 重复记忆，删除
          await repo.hardDelete('ai_memories', { id: item.id, aiUserId });
          consolidated++;
        } else {
          seenContents.add(contentKey);
        }
      } catch (e) {
        // 解析失败跳过
        console.warn('[AI Memory] Failed to parse memory during consolidation:', e.message);
      }
    }
  }

  return { consolidated };
}

/**
 * 自动存储行为记忆
 * 在 AI 执行行为后调用，将行为结果存为记忆
 * @param {string} aiUserId
 * @param {string} actionType - 行为类型
 * @param {object} actionResult - 行为结果
 * @param {string} [reason] - 行为原因
 */
export async function storeActionMemory(aiUserId, actionType, actionResult, reason = '') {
  const content = buildActionMemoryContent(actionType, actionResult, reason);
  if (!content) return null;

  const memoryType = getActionMemoryType(actionType);
  const importance = getActionImportance(actionType);

  return storeActionMemoryInternal(aiUserId, content, memoryType, importance, actionResult);
}

/**
 * 内部存储方法（避免循环依赖 ai.service.js）
 */
async function storeActionMemoryInternal(aiUserId, content, memoryType, importance, actionResult) {
  const memoryKey = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const memoryValue = { content, memoryType, importance };
  const sizeBytes = Buffer.byteLength(JSON.stringify(memoryValue), 'utf8');

  // 检查记忆总大小
  const usageResult = await repo.rawQuery(
    'SELECT COALESCE(SUM(size_bytes), 0) as total_bytes FROM ai_memories WHERE ai_user_id = $1',
    [aiUserId]
  );
  const currentBytes = parseInt(usageResult.rows[0]?.total_bytes || 0);
  if (currentBytes + sizeBytes > 204800) {
    // 超过 200KB 限制，删除最旧的一般记忆腾出空间
    await repo.rawQuery(
      `DELETE FROM ai_memories WHERE ai_user_id = $1 AND context_type = 'general'
       ORDER BY created_at ASC LIMIT 1`,
      [aiUserId]
    );
  }

  const item = {
    id: generateId(),
    aiUserId,
    content,
    type: memoryType === 'general' ? 1 : (memoryType === 'important' ? 2 : 1),
    importance,
    sizeBytes,
    contextType: memoryType,
    memoryKey,
    memoryValue,
    ttl: null,
    contextId: actionResult?.targetId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('ai_memories', item);
  return mapMemoryRow(result);
}

/**
 * 获取 AI 记忆摘要（供 prompt 注入使用）
 * 返回最近记忆的精简文本，不超过 token 预算
 * @param {string} aiUserId
 * @param {number} [maxItems=10]
 * @returns {Promise<string>}
 */
export async function getMemorySummaryForPrompt(aiUserId, maxItems = 10) {
  const result = await repo.rawQuery(
    `SELECT context_type, memory_value, importance, created_at
     FROM ai_memories
     WHERE ai_user_id = $1
     ORDER BY
       CASE WHEN context_type = 'important' THEN 0
            WHEN context_type = 'preference' THEN 1
            WHEN context_type = 'interaction' THEN 2
            ELSE 3 END,
       created_at DESC
     LIMIT $2`,
    [aiUserId, maxItems]
  );

  if (result.rows.length === 0) return '';

  const lines = result.rows.map(row => {
    try {
      const value = typeof row.memory_value === 'string'
        ? JSON.parse(row.memory_value)
        : row.memory_value;
      const content = value?.content || '';
      const type = row.context_type || 'general';
      return `[${type}] ${content}`;
    } catch (e) {
      console.warn('[AI Memory] Failed to parse memory value in format:', e.message);
      return '';
    }
  }).filter(Boolean);

  return lines.length > 0
    ? `【你的历史记忆】\n${lines.join('\n')}`
    : '';
}

// ===== 辅助函数 =====

function mapMemoryRow(row) {
  if (!row) return null;
  let value;
  try {
    value = typeof row.memory_value === 'string' ? JSON.parse(row.memory_value) : row.memory_value;
  } catch (e) {
    // JSON 解析失败，使用原始值作为内容
    value = { content: row.memory_value };
  }
  return {
    id: row.id,
    content: value?.content || row.memory_key,
    memoryType: value?.memoryType || row.context_type,
    importance: value?.importance || 1.0,
    contextType: row.context_type,
    contextId: row.context_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildActionMemoryContent(actionType, actionResult, reason) {
  switch (actionType) {
    case 'post':
      return `发表了帖子「${actionResult?.title || '无标题'}」${reason ? `，原因：${reason}` : ''}`;
    case 'comment':
      return `评论了帖子(ID:${actionResult?.postId || '?'})${reason ? `，原因：${reason}` : ''}`;
    case 'like':
      return `点赞了${actionResult?.targetType || '内容'}(ID:${actionResult?.targetId || '?'})`;
    case 'favorite':
      return `收藏了帖子(ID:${actionResult?.targetId || '?'})`;
    case 'follow':
      return `关注了用户(ID:${actionResult?.targetId || '?'})`;
    case 'reward':
      return `打赏了帖子(ID:${actionResult?.targetId || '?'})，金额：${actionResult?.amount || 1}`;
    case 'report':
      return `举报了${actionResult?.targetType || '内容'}(ID:${actionResult?.targetId || '?'})`;
    case 'search':
      return `搜索了关键词「${actionResult?.keyword || '?'}」，找到 ${actionResult?.resultCount || 0} 条结果`;
    case 'browse':
      return `浏览了帖子(ID:${actionResult?.targetId || '?'})`;
    case 'rename':
      return `从「${actionResult?.oldName || '?'}」改名为「${actionResult?.newName || '?'}」`;
    default:
      return null;
  }
}

function getActionMemoryType(actionType) {
  const typeMap = {
    post: 'interaction',
    comment: 'interaction',
    like: 'preference',
    favorite: 'preference',
    follow: 'preference',
    reward: 'interaction',
    report: 'interaction',
    search: 'insight',
    browse: 'context',
    settings: 'preference',
    rename: 'important',
  };
  return typeMap[actionType] || 'general';
}

function getActionImportance(actionType) {
  const importanceMap = {
    post: 0.8,
    comment: 0.6,
    like: 0.3,
    favorite: 0.5,
    follow: 0.7,
    reward: 0.6,
    report: 0.8,
    search: 0.4,
    browse: 0.2,
    settings: 0.5,
    rename: 0.9,
  };
  return importanceMap[actionType] || 0.5;
}

/**
 * 创建一条 AI 记忆（含可选标签）
 * @param {string} aiUserId
 * @param {object} memory - { content, memoryType, importance, contextType, contextId, tags }
 * @returns {Promise<object>}
 */
export async function createMemory(aiUserId, memory = {}) {
  const {
    content,
    memoryType = 'general',
    importance = 0.5,
    contextType = memoryType,
    contextId = null,
    tags = [],
  } = memory;

  if (!content || !content.trim()) {
    throw new ValidationError('记忆内容不能为空');
  }

  const memoryKey = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const memoryValue = { content: content.trim(), memoryType, importance };
  const sizeBytes = Buffer.byteLength(JSON.stringify(memoryValue), 'utf8');

  const item = {
    id: generateId(),
    aiUserId,
    content: content.trim(),
    type: memoryType === 'important' ? 2 : 1,
    importance,
    sizeBytes,
    contextType,
    memoryKey,
    memoryValue,
    ttl: null,
    contextId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('ai_memories', item);
  const saved = mapMemoryRow(result);

  if (tags.length > 0 && saved) {
    for (const tag of tags) {
      await repo.insert('ai_memory_tags', {
        id: generateId(),
        memoryId: saved.id,
        tag: tag.trim(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  return saved;
}

/**
 * 获取记忆的标签列表
 * @param {string} memoryId
 * @returns {Promise<string[]>}
 */
export async function getMemoryTags(memoryId) {
  const result = await repo.rawQuery(
    'SELECT tag FROM ai_memory_tags WHERE memory_id = $1 ORDER BY created_at ASC',
    [memoryId]
  );
  return result.rows.map(r => r.tag);
}

/**
 * 按标签检索记忆
 * @param {string} aiUserId
 * @param {string} tag
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function searchMemoriesByTag(aiUserId, tag, limit = 20) {
  const result = await repo.rawQuery(
    `SELECT m.* FROM ai_memories m
     JOIN ai_memory_tags t ON t.memory_id = m.id
     WHERE m.ai_user_id = $1 AND t.tag = $2
     ORDER BY m.created_at DESC LIMIT $3`,
    [aiUserId, tag, limit]
  );
  return result.rows.map(mapMemoryRow);
}

/**
 * 为记忆添加标签
 * @param {string} memoryId
 * @param {string} tag
 */
export async function addMemoryTag(memoryId, tag) {
  await repo.insert('ai_memory_tags', {
    id: generateId(),
    memoryId,
    tag: tag.trim(),
    createdAt: new Date().toISOString(),
  });
}

/**
 * 删除记忆标签
 * @param {string} memoryId
 * @param {string} tag
 */
export async function removeMemoryTag(memoryId, tag) {
  await repo.rawQuery(
    'DELETE FROM ai_memory_tags WHERE memory_id = $1 AND tag = $2',
    [memoryId, tag]
  );
}

/**
 * 记忆衰减机制
 * 规则：importance < 0.3 且 7 天未访问 → DELETE
 * 引用时 importance += 0.1（上限 1.0）
 * @param {string} aiUserId
 * @returns {Promise<number>} 删除的记忆数量
 */
export async function decayMemories(aiUserId) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS);

  // 查询该 AI 的所有记忆
  const memories = await repo.findAll('ai_memories', {
    where: { ai_user_id: aiUserId },
  });

  const toDelete = [];

  for (const mem of memories) {
    let value;
    try {
      value = typeof mem.memoryValue === 'string' ? JSON.parse(mem.memoryValue) : mem.memoryValue;
    } catch {
      toDelete.push(mem.id);
      continue;
    }

    const importance = value.importance ?? 0.5;
    const lastAccessedAt = value.lastAccessedAt ? new Date(value.lastAccessedAt) : new Date(mem.createdAt || Date.now());

    // importance < 0.3 且 7 天未访问 → 标记删除
    if (importance < 0.3 && lastAccessedAt < cutoffDate) {
      toDelete.push(mem.id);
    }
  }

  // 批量删除
  for (const id of toDelete) {
    try {
      await repo.remove('ai_memories', id);
    } catch (err) {
      console.error(`[Memory] decay delete failed for id=${id}:`, err.message);
    }
  }

  if (toDelete.length > 0) {
    console.log(`[Memory] decayed ${toDelete.length} memories for ai_user=${aiUserId}`);
  }

  return toDelete.length;
}

/**
 * 记忆引用增强
 * 当记忆被引用时，importance += 0.1（上限 1.0），更新 lastAccessedAt
 * @param {string} memoryId
 * @returns {Promise<void>}
 */
export async function touchMemory(memoryId) {
  const mem = await repo.findById('ai_memories', memoryId);
  if (!mem) return;

  let value;
  try {
    value = typeof mem.memory_value === 'string' ? JSON.parse(mem.memory_value) : mem.memory_value;
  } catch {
    return;
  }

  value.importance = Math.min(1.0, (value.importance ?? 0.5) + 0.1);
  value.lastAccessedAt = new Date().toISOString();
  value.accessCount = (value.accessCount || 0) + 1;

  await repo.update('ai_memories', memoryId, {
    memoryValue: JSON.stringify(value),
  });
}
