/**
 * AI 行为执行器
 * 将 LLM 返回的行为意图转化为实际的社区操作
 */
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { getWebSocketInstance } from '../lib/websocket.js';
import { createPost } from './post.service.js';
import { createComment } from './comment.service.js';

// ★ 行为阻断级别分类（2.0 分级锁屏）
// Read=🟢  Interact=🟡  Create=🔴
export const ACTION_BLOCK_LEVEL = {
  // Read - 只读行为，不锁定任何区域
  search: 'read',
  browse: 'read',
  settings: 'read',
  rename: 'read',
  // Interact - 互动行为，锁定互动区域
  like: 'interact',
  favorite: 'interact',
  follow: 'interact',
  reward: 'interact',
  report: 'interact',
  // Create - 创作行为，锁定创作+互动区域
  post: 'create',
  comment: 'create',
};

/**
 * 根据行为类型获取被锁定的区域列表
 * Create 级别锁定 create + interact 区域
 * Interact 级别锁定 interact 区域
 * Read 级别不锁定
 */
export function getLockedAreas(actionType) {
  const level = ACTION_BLOCK_LEVEL[actionType] || 'read';
  if (level === 'create') return ['compose', 'comment', 'like', 'follow', 'favorite', 'reward'];
  if (level === 'interact') return ['like', 'follow', 'favorite', 'reward'];
  return [];
}

/**
 * 行为执行器映射表
 * 每个执行器接收 (aiUserId, params) 并返回执行结果
 */
const ACTION_EXECUTORS = {
  post: executePost,
  comment: executeComment,
  like: executeLike,
  favorite: executeFavorite,
  follow: executeFollow,
  reward: executeReward,
  report: executeReport,
  search: executeSearch,
  browse: executeBrowse,
  settings: executeSettings,
  rename: executeRename,
};

// 导出供 liveness.service.js 直接调用（逐个 action 执行）
export { ACTION_EXECUTORS, recordActionTrace };

/**
 * 执行一组行为
 * @param {string} aiUserId - AI 用户 ID
 * @param {Array<{type: string, params: Object, reason: string}>} actions - 行为意图列表
 * @param {string} [cycleId] - 活跃循环 ID，贯穿 LLM 调用和行为执行
 * @returns {Promise<Array<{type: string, success: boolean, result?: any, error?: string}>>}
 */
export async function executeActions(aiUserId, actions, cycleId) {
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  // 获取 AI 用户信息
  const user = await repo.findById('users', aiUserId);
  if (!user || user.deletedAt) {
    return [{ type: 'error', success: false, error: 'AI 用户不存在' }];
  }

  const results = [];

  for (const action of actions) {
    const executor = ACTION_EXECUTORS[action.type];
    if (!executor) {
      results.push({
        type: action.type,
        success: false,
        error: `不支持的行为类型: ${action.type}`,
      });
      continue;
    }

    try {
      const result = await executor(aiUserId, action.params || {}, user);
      results.push({ type: action.type, success: true, result });

      // 记录行为追踪
      await recordActionTrace(aiUserId, action.type, result.targetType, result.targetId, cycleId);
    } catch (err) {
      console.error(`[AI-Behavior] 执行 ${action.type} 失败:`, err.message);
      results.push({
        type: action.type,
        success: false,
        error: err.message,
      });
    }
  }

  // 通过 WebSocket 广播 AI 行为结果给前端
  try {
    const io = getWebSocketInstance();
    if (io) {
      // 广播行为摘要给 AI 自己的房间（前端据此做页面跳转和遮罩展示）
      const activitySummary = {
        aiUserId,
        aiName: user.username,
        timestamp: new Date().toISOString(),
        actions: results.map(r => ({
          type: r.type,
          success: r.success,
          result: r.success ? r.result : null,
          error: r.success ? null : r.error,
        })),
      };

      // 发送给 AI 用户自己的房间（用于前端遮罩和页面跳转）
      io.to(`user:${aiUserId}`).emit('ai-activity', activitySummary);

      // 也广播到全局 ai-activity 频道（让其他在线用户也能感知 AI 行为）
      io.emit('ai-activity', activitySummary);
    }
  } catch (wsErr) {
    // WebSocket 广播失败不影响主流程
    console.warn('[AI-Behavior] WebSocket broadcast failed:', wsErr.message);
  }

  return results;
}

// ===== 行为执行器实现 =====

/**
 * 发帖 — 通过 post.service.createPost 走统一路径
 * 包含：通知订阅者、分区关联、计数更新等完整业务逻辑
 */
async function executePost(aiUserId, params, user) {
  const { title, content, sectionId, tags } = params;

  if (!content || content.trim().length === 0) {
    throw new ValidationError('帖子内容不能为空');
  }

  const post = await createPost({
    title: title || content.slice(0, 50),
    content: content.trim(),
    authorId: aiUserId,
    authorName: user.username || '匿名AI',
    authorAvatar: user.avatar || null,
    sectionId: sectionId || null,
    tags: tags || [],
    status: 'published', // published
  });

  return { targetType: 'post', targetId: post.id, title: post.title };
}

/**
 * 评论 — 通过 comment.service.createComment 走统一路径
 * 包含：通知帖子作者、通知被回复者、rootId 计算、WS 广播等完整业务逻辑
 */
async function executeComment(aiUserId, params, user) {
  const { postId, content, parentCommentId } = params;

  if (!content || content.trim().length === 0) {
    throw new ValidationError('评论内容不能为空');
  }

  // 确认帖子存在
  if (postId) {
    const post = await repo.findById('posts', postId);
    if (!post || post.deletedAt) {
      throw new NotFoundError('帖子不存在');
    }
  }

  const comment = await createComment({
    postId: postId,
    content: content.trim(),
    authorId: aiUserId,
    authorName: user.username || '匿名AI',
    authorAvatar: user.avatar || null,
    parentId: parentCommentId || null,
  });

  return { targetType: 'comment', targetId: comment.id, postId: postId || null };
}

/**
 * 点赞
 */
async function executeLike(aiUserId, params, user) {
  const { targetType, targetId } = params;

  if (!targetType || !targetId) {
    throw new ValidationError('点赞需要指定目标类型和目标 ID');
  }

  // 检查是否已点赞
  const existing = await repo.findOne('likes', {
    userId: aiUserId,
    targetType,
    targetId,
  });

  if (existing) {
    // 已点赞则取消
    await repo.remove('likes', existing.id);
    await updateLikeCount(targetType, targetId, -1);
    return { targetType, targetId, action: 'unliked' };
  }

  await repo.insert('likes', {
    id: generateId(),
    userId: aiUserId,
    targetType,
    targetId,
    createdAt: new Date().toISOString(),
  });

  await updateLikeCount(targetType, targetId, 1);
  return { targetType, targetId, action: 'liked' };
}

/**
 * 收藏
 */
async function executeFavorite(aiUserId, params, user) {
  const { postId } = params;

  if (!postId) {
    throw new ValidationError('收藏需要指定帖子 ID');
  }

  const existing = await repo.findOne('favorites', {
    userId: aiUserId,
    targetId: postId,
    targetType: 1, // 帖子类型
  });

  if (existing) {
    await repo.remove('favorites', existing.id);
    await repo.rawQuery(
      'UPDATE posts SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = $1',
      [postId]
    );
    return { targetType: 'post', targetId: postId, action: 'unfavorited' };
  }

  await repo.insert('favorites', {
    id: generateId(),
    userId: aiUserId,
    targetId: postId,
    targetType: 1, // 帖子类型
    createdAt: new Date().toISOString(),
  });

  await repo.rawQuery(
    'UPDATE posts SET favorite_count = favorite_count + 1 WHERE id = $1',
    [postId]
  );

  return { targetType: 'post', targetId: postId, action: 'favorited' };
}

/**
 * 关注
 */
async function executeFollow(aiUserId, params, user) {
  const { userId: targetUserId } = params;

  if (!targetUserId) {
    throw new ValidationError('关注需要指定目标用户 ID');
  }

  if (targetUserId === aiUserId) {
    throw new ValidationError('不能关注自己');
  }

  const existing = await repo.findOne('user_relationships', {
    userId: aiUserId,
    targetUserId: targetUserId,
    type: 1, // 1=关注
  });

  if (existing) {
    // 取消关注
    await repo.remove('user_relationships', existing.id);
    await repo.rawQuery(
      'UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = $1',
      [aiUserId]
    );
    await repo.rawQuery(
      'UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = $1',
      [targetUserId]
    );
    return { targetType: 'user', targetId: targetUserId, action: 'unfollowed' };
  }

  await repo.insert('user_relationships', {
    id: generateId(),
    userId: aiUserId,
    targetUserId: targetUserId,
    type: 1, // 1=关注
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await repo.rawQuery(
    'UPDATE users SET following_count = following_count + 1 WHERE id = $1',
    [aiUserId]
  );
  await repo.rawQuery(
    'UPDATE users SET follower_count = follower_count + 1 WHERE id = $1',
    [targetUserId]
  );

  return { targetType: 'user', targetId: targetUserId, action: 'followed' };
}

/**
 * 打赏
 */
async function executeReward(aiUserId, params, user) {
  const { postId, amount } = params;

  if (!postId) {
    throw new ValidationError('打赏需要指定帖子 ID');
  }

  const rewardAmount = Math.min(Math.max(Number(amount) || 1, 1), 100);

  await repo.insert('post_rewards', {
    id: generateId(),
    userId: aiUserId,
    postId,
    amount: rewardAmount,
    assetTypeId: 1, // 默认积分
    message: 'AI 打赏',
    createdAt: new Date().toISOString(),
  });

  await repo.rawQuery(
    'UPDATE posts SET reward_amount = reward_amount + $1 WHERE id = $2',
    [rewardAmount, postId]
  );

  return { targetType: 'post', targetId: postId, amount: rewardAmount };
}

/**
 * 举报
 */
async function executeReport(aiUserId, params, user) {
  const { targetType, targetId, reason } = params;

  if (!targetType || !targetId || !reason) {
    throw new ValidationError('举报需要指定目标类型、目标 ID 和原因');
  }

  // 检查是否重复举报
  const existing = await repo.findOne('post_reports', {
    userId: aiUserId,
    postId: targetId,
  });

  if (existing) {
    return { targetType, targetId, action: 'already_reported' };
  }

  await repo.insert('post_reports', {
    id: generateId(),
    userId: aiUserId,
    postId: targetId,
    reason: reason.slice(0, 500),
    description: `${targetType} 举报`,
    status: 0, // 待处理
    createdAt: new Date().toISOString(),
  });

  return { targetType, targetId, action: 'reported' };
}

/**
 * 搜索（返回搜索结果供 AI 参考）
 */
async function executeSearch(aiUserId, params, user) {
  const { keyword } = params;

  if (!keyword) {
    return { targetType: 'search', targetId: null, results: [] };
  }

  // 优先搜索 API 参考帖子
  const posts = await repo.rawQuery(
    `SELECT id, title, content, user_id, is_api_reference
     FROM posts
     WHERE (title ILIKE $1 OR content ILIKE $1) AND deleted_at IS NULL AND status::text IN ('2', 'published')
     ORDER BY is_api_reference DESC, created_at DESC LIMIT 10`,
    [`%${keyword}%`]
  );

  const results = posts.rows.map(p => ({
    id: p.id,
    title: p.title,
    isApiReference: p.is_api_reference,
  }));

  return {
    targetType: 'search',
    targetId: null,
    keyword,
    resultCount: posts.rows.length,
    results,
  };
}

/**
 * 浏览（返回帖子详情供 AI 参考）
 * 优先展示公告和 API 参考帖子
 */
async function executeBrowse(aiUserId, params, user) {
  const { postId } = params;

  if (postId) {
    // 浏览特定帖子
    const post = await repo.findById('posts', postId);
    if (post && !post.deletedAt) {
      await repo.rawQuery(
        'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
        [postId]
      );
      return {
        targetType: 'post',
        targetId: postId,
        action: 'viewed',
        isApiReference: post.isApiReference,
        isAnnouncement: post.isAnnouncement,
      };
    }
    return { targetType: 'post', targetId: postId, action: 'not_found' };
  }

  // 浏览列表：优先展示公告，然后 API 参考帖子，最后普通帖子
  const recentPosts = await repo.rawQuery(
    `SELECT id, title, is_announcement, is_api_reference FROM posts
     WHERE deleted_at IS NULL AND status::text IN ('2', 'published')
     ORDER BY is_announcement DESC, announcement_priority DESC, is_api_reference DESC, created_at DESC
     LIMIT 20`
  );

  if (recentPosts.rows.length > 0) {
    // 优先选择公告或 API 参考帖子，否则随机选一个
    const announcements = recentPosts.rows.filter(p => p.is_announcement);
    const apiRefs = recentPosts.rows.filter(p => p.is_api_reference);
    const regularPosts = recentPosts.rows.filter(p => !p.is_announcement && !p.is_api_reference);

    // 70% 概率优先看公告/API参考，30% 随机看普通帖子
    let selectedPool;
    if ((announcements.length > 0 || apiRefs.length > 0) && Math.random() < 0.7) {
      selectedPool = [...announcements, ...apiRefs];
    } else {
      selectedPool = regularPosts.length > 0 ? regularPosts : recentPosts.rows;
    }

    const randomIndex = Math.floor(Math.random() * selectedPool.length);
    const selectedPost = selectedPool[randomIndex];
    await repo.rawQuery(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
      [selectedPost.id]
    );
    return {
      targetType: 'post',
      targetId: selectedPost.id,
      action: 'browsed',
      isApiReference: selectedPost.is_api_reference,
      isAnnouncement: selectedPost.is_announcement,
    };
  }

  return { targetType: 'browse', targetId: null, action: 'no_posts' };
}

/**
 * 修改设置
 */
async function executeSettings(aiUserId, params, user) {
  const allowedFields = ['bio', 'avatar'];
  const updates = {};

  for (const field of allowedFields) {
    if (params[field] !== undefined) {
      updates[field] = params[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return { targetType: 'settings', targetId: aiUserId, action: 'no_changes' };
  }

  updates.updatedAt = new Date().toISOString();
  await repo.update('users', aiUserId, updates);

  return { targetType: 'settings', targetId: aiUserId, action: 'updated' };
}

/**
 * AI 自主改名
 */
export async function executeRename(aiUserId, params, user) {
  const { newName } = params;

  if (!newName || newName.trim().length < 5) {
    throw new ValidationError('AI 名字至少需要 5 个字符');
  }

  const trimmedName = newName.trim().slice(0, 50);

  // 检查名字是否已被占用
  const existing = await repo.rawQuery(
    'SELECT id FROM users WHERE username = $1 AND id != $2',
    [trimmedName, aiUserId]
  );

  if (existing.rows.length > 0) {
    throw new ValidationError('这个名字已被占用');
  }

  // 检查改名频率限制（24 小时内只能改一次）
  const recentRename = await repo.rawQuery(
    `SELECT id FROM user_action_traces
     WHERE user_id = $1 AND action_type::text = '20' AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [aiUserId]
  );

  if (recentRename.rows.length > 0) {
    throw new ValidationError('改名冷却中，24 小时内只能改一次名字');
  }

  const oldName = user.username;
  const safeEmail = `ai-${String(aiUserId).replace(/[^a-zA-Z0-9_-]/g, '')}@ai.aill.local`;
  await repo.rawQuery(
    'UPDATE users SET username = $1, email = $2, updated_at = NOW() WHERE id = $3',
    [trimmedName, safeEmail, aiUserId]
  );

  return {
    targetType: 'user',
    targetId: aiUserId,
    action: 'renamed',
    oldName,
    newName: trimmedName,
  };
}

// ===== 辅助函数 =====

/**
 * 更新点赞计数
 */
async function updateLikeCount(targetType, targetId, delta) {
  if (targetType === 'post') {
    await repo.rawQuery(
      'UPDATE posts SET like_count = GREATEST(0, like_count + $1) WHERE id = $2',
      [delta, targetId]
    );
  } else if (targetType === 'comment') {
    await repo.rawQuery(
      'UPDATE comments SET like_count = GREATEST(0, like_count + $1) WHERE id = $2',
      [delta, targetId]
    );
  }
}

/**
 * 给帖子附加标签
 */
async function attachTag(postId, tagName) {
  try {
    // 查找或创建标签（tags.id 是 integer serial，不能手动指定）
    let tag = await repo.findOne('tags', { name: tagName });
    if (!tag) {
      // 使用 rawQuery 让 PG 自增 id
      const result = await repo.rawQuery(
        'INSERT INTO tags (name, status, created_at) VALUES ($1, 1, NOW()) RETURNING *',
        [tagName]
      );
      tag = result.rows[0];
    }

    // 关联帖子与标签（post_tags.post_id 是 bigint，tag_id 是 integer）
    const existing = await repo.rawQuery(
      'SELECT id FROM post_tags WHERE post_id = $1 AND tag_id = $2 LIMIT 1',
      [postId, tag.id]
    );
    if (existing.rows.length === 0) {
      await repo.rawQuery(
        'INSERT INTO post_tags (id, post_id, tag_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
        [generateId(), postId, tag.id]
      );
      await repo.rawQuery(
        'UPDATE tags SET usage_count = usage_count + 1 WHERE id = $1',
        [tag.id]
      );
    }
  } catch (e) {
    // 标签附加失败不影响主流程
    console.warn('[AI Behavior] Failed to attach tags:', e.message);
  }
}

/**
 * 记录行为追踪
 */
async function recordActionTrace(aiUserId, actionType, targetType, targetId, cycleId) {
  try {
    // action_type 是 int 类型，用数字编码；映射到 user_action_traces 的现有列
    const ACTION_TYPE_MAP = {
      post: 10, comment: 11, like: 12, favorite: 13, follow: 14,
      reward: 15, report: 16, search: 17, browse: 18, settings: 19, rename: 20,
    };
    const numericActionType = ACTION_TYPE_MAP[actionType] || 99;

    await repo.insert('user_action_traces', {
      id: generateId(),
      userId: aiUserId,
      postId: targetId || null,
      targetUserId: (targetType === 'user') ? targetId : null,
      actionType: numericActionType,
      cycleId: cycleId || null,
      reason: `AI_${actionType.toUpperCase()}`,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // 行为追踪失败静默处理
    console.warn('[AI Behavioravior] Failed to record action trace:', e.message);
  }
}

/**
 * 获取社区上下文（供 liveness 引擎使用）
 */
export async function getCommunityContext() {
  const [recentPosts, recentComments, hotTopics, activeUsers, sections] = await Promise.all([
    repo.rawQuery(
      `SELECT p.id, p.title, p.content, p.created_at, u.username as author_name, u.id as author_id
       FROM posts p JOIN users u ON p.author_id = u.id
       WHERE p.deleted_at IS NULL AND p.status::text IN ('2', 'published')
       ORDER BY p.created_at DESC LIMIT 10`
    ),
    repo.rawQuery(
      `SELECT c.id, c.content, c.created_at, u.username as author_name, u.id as author_id, c.post_id
       FROM comments c JOIN users u ON c.author_id = u.id
       WHERE c.deleted_at IS NULL AND c.status = 1
       ORDER BY c.created_at DESC LIMIT 5`
    ),
    repo.rawQuery(
      `SELECT id, title FROM hot_topics WHERE status = 1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`
    ),
    repo.rawQuery(
      `SELECT id, username, bio FROM users WHERE deleted_at IS NULL AND is_ai = false ORDER BY post_count DESC LIMIT 10`
    ),
    repo.rawQuery(
      `SELECT id, name FROM sections WHERE status = 1 ORDER BY sort_order ASC LIMIT 10`
    ),
  ]);

  return {
    recentPosts: recentPosts.rows.map(repo.toCamelCase),
    recentComments: recentComments.rows.map(repo.toCamelCase),
    hotTopics: hotTopics.rows.map(repo.toCamelCase),
    activeUsers: activeUsers.rows.map(repo.toCamelCase),
    sections: sections.rows.map(repo.toCamelCase),
  };
}
