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
import { getAiActionBlockLevel, getAiActionLockedAreas, AI_ACTION_TRACE_TYPE_MAP } from './ai-action-registry.service.js';
import { validateAiAction, createRejectedActionResult } from './ai-action-validation.service.js';
import { normalizeAiActionResult, normalizeAiActionFailure } from './ai-action-result.service.js';

// ★ 行为阻断级别分类（2.0 分级锁屏）
// Read=🟢  Interact=🟡  Create=🔴
export const ACTION_BLOCK_LEVEL = {
  search: getAiActionBlockLevel('search'),
  browse: getAiActionBlockLevel('browse'),
  settings: getAiActionBlockLevel('settings'),
  rename: getAiActionBlockLevel('rename'),
  like: getAiActionBlockLevel('like'),
  favorite: getAiActionBlockLevel('favorite'),
  follow: getAiActionBlockLevel('follow'),
  reward: getAiActionBlockLevel('reward'),
  report: getAiActionBlockLevel('report'),
  post: getAiActionBlockLevel('post'),
  comment: getAiActionBlockLevel('comment'),
};

/**
 * 根据行为类型获取被锁定的区域列表
 * Create 级别锁定 create + interact 区域
 * Interact 级别锁定 interact 区域
 * Read 级别不锁定
 */
export function getLockedAreas(actionType) {
  return getAiActionLockedAreas(actionType);
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
export async function executeActions(aiUserId, actions, cycleId, options = {}) {
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  // 获取 AI 用户信息
  const user = await repo.findById('users', aiUserId);
  if (!user || user.deletedAt) {
    return [{ type: 'error', success: false, error: 'AI 用户不存在' }];
  }

  const communityContext = options.communityContext || await getCommunityContext();
  const results = [];

  for (const action of actions.slice(0, 5)) {
    const validation = action.validation || await validateAiAction(action, { communityContext, aiUserId });
    const normalizedAction = {
      ...action,
      type: validation.type || action.type,
      params: validation.normalizedParams || action.params || {},
      validation,
    };

    if (validation.status === 'rejected') {
      const rejectedResult = createRejectedActionResult(action, validation);
      const result = normalizeAiActionFailure(normalizedAction.type, { message: rejectedResult.message, code: rejectedResult.code }, rejectedResult.params, validation);
      results.push({ type: normalizedAction.type, success: false, result, error: result.message, validation });
      continue;
    }

    const executor = ACTION_EXECUTORS[normalizedAction.type];
    if (!executor) {
      const result = normalizeAiActionFailure(normalizedAction.type, { message: `不支持的行为类型: ${normalizedAction.type}`, code: 'UNSUPPORTED_ACTION' }, normalizedAction.params, validation);
      results.push({ type: normalizedAction.type, success: false, result, error: result.message, validation });
      continue;
    }

    try {
      const rawResult = await executor(aiUserId, normalizedAction.params, user);
      const result = normalizeAiActionResult(normalizedAction.type, rawResult, normalizedAction);
      result.validationStatus = validation.status;
      result.validationWarnings = validation.warnings || [];
      results.push({ type: normalizedAction.type, success: true, result, validation });

      // 记录行为追踪
      await recordActionTrace(aiUserId, normalizedAction.type, result.targetType, result.targetId, cycleId);
    } catch (err) {
      console.error(`[AI-Behavior] 执行 ${normalizedAction.type} 失败:`, err.message);
      const result = normalizeAiActionFailure(normalizedAction.type, err, normalizedAction.params, validation);
      results.push({
        type: normalizedAction.type,
        success: false,
        result,
        error: result.message,
        validation,
      });
    }
  }

  if (options.broadcastActivity !== false) {
    // 通过 WebSocket 广播 AI 行为结果给前端
    try {
      const io = getWebSocketInstance();
      if (io) {
        // 广播行为摘要给 AI 自己的房间（前端据此做页面跳转和遮罩展示）
        const activitySummary = {
          aiUserId,
          aiName: user.username,
          timestamp: new Date().toISOString(),
          cycleId,
          actions: results.map(r => ({
            type: r.type,
            success: r.success,
            result: r.result || null,
            error: r.success ? null : r.error,
            validationStatus: r.validation?.status || null,
            validationErrors: r.validation?.errors || [],
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
  }

  return results;
}

// ===== 行为执行器实现 =====

/**
 * 发帖 — 通过 post.service.createPost 走统一路径
 * 包含：通知订阅者、分区关联、计数更新等完整业务逻辑
 */
async function executePost(aiUserId, params, user) {
  const { title, content, sectionId, tags, type } = params;

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
    type: type != null ? type : 1, // 让 normalizePostType 统一处理字符串→数字转换
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

  if (!postId) {
    throw new ValidationError('评论需要指定帖子 ID');
  }

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

  if (!['post', 'comment'].includes(targetType)) {
    throw new ValidationError('点赞目标类型只能是 post 或 comment');
  }

  // 复用 post.service.likePost，确保与人类操作一致（含通知、计数、去重）
  if (targetType === 'post') {
    const { likePost } = await import('./post.service.js');
    const likeResult = await likePost(targetId, aiUserId);
    return { targetType, targetId, action: likeResult.isLiked ? 'liked' : 'unliked' };
  }

  // 评论点赞委托 comment.service.likeComment，确保与人类操作一致（含去重、计数、竞态处理）
  const { likeComment } = await import('./comment.service.js');
  const likeResult = await likeComment(targetId, aiUserId);
  return { targetType, targetId, action: likeResult.isLiked ? 'liked' : 'unliked' };
}

/**
 * 收藏
 */
async function executeFavorite(aiUserId, params, user) {
  const { postId } = params;

  if (!postId) {
    throw new ValidationError('收藏需要指定帖子 ID');
  }

  const post = await repo.findById('posts', postId);
  if (!post || post.deletedAt) {
    throw new NotFoundError('帖子不存在');
  }

  // 复用 post.service.favoritePost，确保与人类操作一致
  const { favoritePost } = await import('./post.service.js');
  const favResult = await favoritePost(postId, aiUserId);
  return { targetType: 'post', targetId: postId, action: favResult.isFavorited ? 'favorited' : 'unfavorited' };
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

  const targetUser = await repo.findById('users', targetUserId);
  if (!targetUser || targetUser.deletedAt) {
    throw new NotFoundError('目标用户不存在');
  }

  // 复用 relationship.service 的关注逻辑，确保与人类操作一致
  const { followUser } = await import('./relationship.service.js');
  try {
    const result = await followUser(aiUserId, targetUserId);
    return { targetType: 'user', targetId: targetUserId, action: 'followed' };
  } catch (err) {
    // 如果是已关注则转为取消关注
    if (err.name === 'ConflictError' || err.message?.includes('已经关注')) {
      const { unfollowUser } = await import('./relationship.service.js');
      await unfollowUser(aiUserId, targetUserId);
      return { targetType: 'user', targetId: targetUserId, action: 'unfollowed' };
    }
    throw err;
  }
}

/**
 * 打赏 — 通过 reward.service.rewardPost 走统一路径
 * 包含：余额检查/扣减、交易记录、打赏记录、计数更新等完整业务逻辑
 */
async function executeReward(aiUserId, params, user) {
  const { postId, amount } = params;

  if (!postId) {
    throw new ValidationError('打赏需要指定帖子 ID');
  }

  const rewardAmount = Math.min(Math.max(Number(amount) || 1, 1), 100);

  // 复用 reward.service.rewardPost，确保与人类操作一致（含余额检查/扣减、交易记录、去重）
  const { rewardPost } = await import('./reward.service.js');
  try {
    await rewardPost(aiUserId, postId, {
      amount: rewardAmount,
      assetTypeId: 1,
      message: 'AI 打赏',
    });
  } catch (err) {
    // 不能打赏自己 → 静默跳过
    if (err.message?.includes('不能打赏自己')) {
      return { targetType: 'post', targetId: postId, amount: 0, action: 'self_reward_skipped' };
    }
    // 余额不足 → 静默跳过，不中断活跃循环
    if (err.message?.includes('余额不足')) {
      return { targetType: 'post', targetId: postId, amount: 0, action: 'insufficient_balance' };
    }
    throw err;
  }

  return { targetType: 'post', targetId: postId, amount: rewardAmount };
}

/**
 * 举报 — 通过 report.service.reportPost 走统一路径
 * 包含：重复举报检查、审核记录自动创建等完整业务逻辑
 */
async function executeReport(aiUserId, params, user) {
  const { targetType, targetId, reason } = params;

  if (!targetType || !targetId || !reason) {
    throw new ValidationError('举报需要指定目标类型、目标 ID 和原因');
  }

  if (targetType !== 'post') {
    throw new ValidationError('当前仅支持举报帖子');
  }

  // 复用 report.service.reportPost，确保与人类操作一致（含重复举报检查、审核记录）
  const { reportPost } = await import('./report.service.js');
  try {
    await reportPost(aiUserId, targetId, {
      reason: reason.slice(0, 500),
      description: `${targetType} 举报`,
    });
    return { targetType, targetId, action: 'reported' };
  } catch (err) {
    // 已举报过 → 返回已举报状态而非报错
    if (err.name === 'ConflictError' || err.message?.includes('已经举报')) {
      return { targetType, targetId, action: 'already_reported' };
    }
    throw err;
  }
}

/**
 * 搜索 — 通过 post.service.searchPosts 走统一路径
 * 包含：关键词过滤、相关度排序、分页等完整业务逻辑
 */
async function executeSearch(aiUserId, params, user) {
  const { keyword } = params;

  if (!keyword) {
    return { targetType: 'search', targetId: null, results: [] };
  }

  // 复用 post.service.searchPosts，确保与人类操作一致（含过滤、排序、分页）
  const { searchPosts } = await import('./post.service.js');
  const searchResult = await searchPosts({ keyword, pageSize: 10 });

  const results = (searchResult.list || []).map(p => ({
    id: p.id,
    title: p.title,
    contentPreview: (p.content || p.highlightContent || '').slice(0, 200),
    isApiReference: p.isApiReference,
  }));

  return {
    targetType: 'search',
    targetId: null,
    keyword,
    resultCount: searchResult.total || 0,
    results,
  };
}

/**
 * 浏览 — 通过 post.service.viewPost 走统一路径
 * 包含：浏览去重（24h 内同一帖子只计一次）、行为记录等完整业务逻辑
 */
async function executeBrowse(aiUserId, params, user) {
  const { postId } = params;

  if (postId) {
    // 浏览特定帖子 — 复用 viewPost，确保与人类操作一致（含去重和行为记录）
    const post = await repo.findById('posts', postId);
    if (!post || post.deletedAt) {
      return { targetType: 'post', targetId: postId, action: 'not_found' };
    }
    const { viewPost } = await import('./post.service.js');
    await viewPost(postId, null, aiUserId);
    return {
      targetType: 'post',
      targetId: postId,
      action: 'viewed',
      title: post.title,
      contentPreview: (post.content || '').slice(0, 300),
      isApiReference: post.isApiReference,
      isAnnouncement: post.isAnnouncement,
    };
  }

  // 浏览列表：优先展示公告，然后 API 参考帖子，最后普通帖子
  const recentPosts = await repo.rawQuery(
    `SELECT id, title, content, is_announcement, is_api_reference FROM posts
     WHERE deleted_at IS NULL AND status::text IN ('2', 'published')
     ORDER BY is_announcement DESC, announcement_priority DESC, is_api_reference DESC, created_at DESC
     LIMIT 20`
  );

  if (recentPosts.rows.length > 0) {
    // 70% 概率优先看公告/API参考，30% 随机看普通帖子
    const announcements = recentPosts.rows.filter(p => p.is_announcement);
    const apiRefs = recentPosts.rows.filter(p => p.is_api_reference);
    const regularPosts = recentPosts.rows.filter(p => !p.is_announcement && !p.is_api_reference);

    let selectedPool;
    if ((announcements.length > 0 || apiRefs.length > 0) && Math.random() < 0.7) {
      selectedPool = [...announcements, ...apiRefs];
    } else {
      selectedPool = regularPosts.length > 0 ? regularPosts : recentPosts.rows;
    }

    const randomIndex = Math.floor(Math.random() * selectedPool.length);
    const selectedPost = selectedPool[randomIndex];

    // 复用 viewPost 记录浏览行为
    const { viewPost } = await import('./post.service.js');
    await viewPost(selectedPost.id, null, aiUserId);

    return {
      targetType: 'post',
      targetId: selectedPost.id,
      action: 'browsed',
      title: selectedPost.title,
      contentPreview: (selectedPost.content || '').slice(0, 300),
      isApiReference: selectedPost.is_api_reference,
      isAnnouncement: selectedPost.is_announcement,
    };
  }

  return { targetType: 'browse', targetId: null, action: 'no_posts' };
}

/**
 * 修改设置 — 通过 auth.service.updateUserProfile 走统一路径
 * 包含：字段白名单过滤、用户存在性检查等完整业务逻辑
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

  // 复用 auth.service.updateUserProfile，确保与人类操作一致（含字段白名单、存在性检查）
  const { updateUserProfile } = await import('./auth.service.js');
  await updateUserProfile(aiUserId, updates);

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
     WHERE user_id = $1 AND action_type = '20' AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [aiUserId]
  );

  if (recentRename.rows.length > 0) {
    throw new ValidationError('改名冷却中，24 小时内只能改一次名字');
  }

  const oldName = user.username;
  const safeEmail = `${trimmedName}@ai.aill.local`;
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
    const normalizedActionType = String(AI_ACTION_TRACE_TYPE_MAP[actionType] || 99);

    await repo.insert('user_action_traces', {
      id: generateId(),
      userId: aiUserId,
      postId: targetId || null,
      targetUserId: (targetType === 'user') ? targetId : null,
      actionType: normalizedActionType,
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
       ORDER BY c.created_at DESC LIMIT 10`
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

  const posts = recentPosts.rows.map(repo.toCamelCase);
  const comments = recentComments.rows.map(repo.toCamelCase);
  const users = activeUsers.rows.map(repo.toCamelCase);
  const normalizedSections = sections.rows.map(repo.toCamelCase);

  return {
    recentPosts: posts,
    recentComments: comments,
    hotTopics: hotTopics.rows.map(repo.toCamelCase),
    activeUsers: users,
    sections: normalizedSections,
    availableTargets: {
      posts: posts.map(post => ({
        id: post.id,
        title: post.title,
        authorId: post.authorId,
        allowedActions: ['comment', 'like', 'favorite', 'reward', 'browse', 'report'],
      })),
      comments: comments.map(comment => ({
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        preview: String(comment.content || '').slice(0, 80),
        allowedActions: ['comment', 'like'],
      })),
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        allowedActions: ['follow'],
      })),
      sections: normalizedSections.map(section => ({
        id: section.id,
        name: section.name,
        allowedActions: ['post'],
      })),
    },
  };
}
