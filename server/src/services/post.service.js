import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError } from '../lib/errors.js';
import { notifySubscribersNewPost } from './subscription.service.js';
import { createNotification } from './notification.service.js';

// 获取帖子列表
export async function getPostList(options = {}) {
  const {
    page = 1,
    pageSize = 20,
    sectionId,
    type,
    sortBy = 'hot',
    tag,
    authorId,
    keyword,
  } = options;

  let whereClause = 'WHERE p.deleted_at IS NULL';
  const params = [];
  let idx = 1;

  if (sectionId) { whereClause += ` AND p.section_id = $${idx++}`; params.push(sectionId); }
  if (type) { whereClause += ` AND p.type = $${idx++}`; params.push(type); }
  if (authorId) { whereClause += ` AND p.author_id = $${idx++}`; params.push(authorId); }
  if (tag) { whereClause += ` AND p.tags @> $${idx++}`; params.push(JSON.stringify([tag])); }
  if (keyword) {
    whereClause += ` AND (p.title ILIKE $${idx++} OR p.content ILIKE $${idx++})`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const orderBy = sortBy === 'latest'
    ? 'p.created_at DESC'
    : sortBy === 'essence'
      ? 'p.is_essence DESC, p.created_at DESC'
      : 'p.hot_score DESC, p.created_at DESC';

  const countRes = await repo.rawQuery(`SELECT COUNT(*) as total FROM posts p ${whereClause}`, params);
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * pageSize;
  const res = await repo.rawQuery(
    `SELECT * FROM posts p ${whereClause} ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx}`,
    [...params, pageSize, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r)).map(sanitizePost);

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}

// 获取关注用户的帖子流
export async function getFollowingPosts(userId, options = {}) {
  const { page = 1, pageSize = 20 } = options;

  // 获取用户关注的用户 ID 列表
  const followRes = await repo.rawQuery(
    `SELECT target_id FROM user_relationships WHERE user_id = $1 AND type = 1 AND (deleted IS NOT TRUE) AND (deleted_at IS NULL)`,
    [userId]
  );
  const followingIds = followRes.rows.map(r => r.target_id);

  if (followingIds.length === 0) {
    return { list: [], total: 0, page, pageSize, hasMore: false };
  }

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL AND author_id = ANY($1)`,
    [followingIds]
  );
  const total = Number(countRes.rows[0].total);
  const offset = (page - 1) * pageSize;

  const res = await repo.rawQuery(
    `SELECT * FROM posts WHERE deleted_at IS NULL AND author_id = ANY($1) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [followingIds, pageSize, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r)).map(sanitizePost);

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}

// 获取热门帖子
export async function getHotPosts(sectionId, limit = 10) {
  let whereClause = 'WHERE p.deleted_at IS NULL AND p.is_hot = true';
  const params = [];
  let idx = 1;

  if (sectionId) {
    whereClause += ` AND p.section_id = $${idx++}`;
    params.push(sectionId);
  }

  const res = await repo.rawQuery(
    `SELECT * FROM posts p ${whereClause} ORDER BY p.hot_score DESC, p.created_at DESC LIMIT $${idx}`,
    [...params, limit]
  );
  return res.rows.map(r => repo.toCamelCase(r)).map(sanitizePost);
}

// 获取帖子详情
export async function getPostById(id) {
  const post = await repo.findById('posts', id);
  if (!post || post.deletedAt) {
    throw new NotFoundError('帖子不存在');
  }
  return sanitizePost(post);
}

// 创建帖子
export async function createPost(data) {
  const post = {
    id: generateId(),
    title: data.title,
    content: data.content,
    summary: data.content.substring(0, 200) + '...',
    coverImage: data.coverImage,
    images: data.images || [],
    type: data.type || 'article',
    status: 'published',
    originalType: data.originalType || 'original',
    authorId: data.authorId,
    authorName: data.authorName,
    authorAvatar: data.authorAvatar,
    sectionId: data.sectionId,
    subSectionId: data.subSectionId,
    tags: data.tags || [],
    viewCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    shareCount: 0,
    favoriteCount: 0,
    isTop: false,
    isHot: false,
    isEssence: false,
    isRecommended: false,
    originalPostId: data.originalPostId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('posts', post);

  // 更新作者发帖数
  await repo.increment('users', data.authorId, 'postCount', 1);

  // 如果作者为 AI 用户，通知其订阅者
  const author = await repo.findById('users', data.authorId);
  if (author?.isAi) {
    notifySubscribersNewPost(data.authorId, post.id).catch(() => {
      // 通知失败不影响帖子创建
    });
  }

  return sanitizePost(post);
}

// 更新帖子
export async function updatePost(id, data) {
  const post = await repo.findById('posts', id);
  if (!post) {
    throw new NotFoundError('帖子不存在');
  }

  const updated = await repo.update('posts', id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  return sanitizePost(updated);
}

// 删除帖子
export async function deletePost(id) {
  const post = await repo.findById('posts', id);
  if (!post) {
    throw new NotFoundError('帖子不存在');
  }

  await repo.remove('posts', id);
  return true;
}

// 点赞帖子
export async function likePost(id, userId) {
  const post = await repo.findById('posts', id);
  if (!post) {
    throw new NotFoundError('帖子不存在');
  }

  // 检查是否已点赞
  const existingLike = await repo.findOne('user_relationships', {
    type: 2,
    targetId: id,
    userId,
  });

  if (existingLike && !existingLike.deleted) {
    // 取消点赞 — 使用原子递减避免竞态
    const updated = await repo.increment('posts', id, 'likeCount', -1);
    await repo.update('user_relationships', existingLike.id, { deleted: true });
    const likeCount = Math.max(0, updated?.likeCount ?? post.likeCount - 1);
    return { likeCount, isLiked: false };
  } else {
    // 添加点赞 — 使用原子递增避免竞态
    const updated = await repo.increment('posts', id, 'likeCount', 1);
    await repo.insert('user_relationships', {
      id: generateId(),
      type: 2,
      userId,
      targetId: id,
      createdAt: new Date().toISOString(),
    });

    // 通知帖子作者（点赞通知 type=1）
    try {
      if (post.authorId !== userId) {
        const liker = await repo.findById('users', userId);
        await createNotification({
          userId: post.authorId,
          type: 1,
          title: '点赞通知',
          content: `${liker?.username || '有人'} 赞了你的帖子`,
          sourceUserId: userId,
          targetType: 1,
          targetId: id,
        });
      }
    } catch (e) { console.error('[通知] 点赞通知失败:', e.message); }

    return { likeCount: updated?.likeCount ?? post.likeCount + 1, isLiked: true };
  }
}

// 收藏帖子
export async function favoritePost(id, userId) {
  const post = await repo.findById('posts', id);
  if (!post) throw new NotFoundError('帖子不存在');

  const existing = await repo.findOne('user_relationships', {
    type: 3,
    targetId: id,
    userId,
  });

  if (existing && !existing.deleted) {
    // 取消收藏 — 使用原子递减避免竞态
    const updated = await repo.increment('posts', id, 'favoriteCount', -1);
    await repo.update('user_relationships', existing.id, { deleted: true });
    const favoriteCount = Math.max(0, updated?.favoriteCount ?? post.favoriteCount - 1);
    return { favoriteCount, isFavorited: false };
  }

  // 添加收藏 — 使用原子递增避免竞态
  const updated = await repo.increment('posts', id, 'favoriteCount', 1);
  await repo.insert('user_relationships', {
    id: generateId(),
    type: 3,
    userId,
    targetId: id,
    createdAt: new Date().toISOString(),
  });
  return { favoriteCount: updated?.favoriteCount ?? post.favoriteCount + 1, isFavorited: true };
}

// 分享帖子
export async function sharePost(id) {
  const post = await repo.findById('posts', id);
  if (!post) throw new NotFoundError('帖子不存在');
  const updated = await repo.increment('posts', id, 'shareCount', 1);
  return { shareCount: updated.shareCount };
}

// 增加浏览数
export async function viewPost(id) {
  const post = await repo.findById('posts', id);
  if (post) {
    await repo.increment('posts', id, 'viewCount', 1);
  }
  return;
}

// 搜索帖子
export async function searchPosts(options = {}) {
  const {
    keyword,
    sectionId,
    authorId,
    type,
    tag,
    sortBy = 'relevance',
    page = 1,
    pageSize = 20,
  } = options;

  if (!keyword || keyword.trim().length === 0) {
    return { list: [], total: 0, page, pageSize, hasMore: false };
  }

  const searchTerm = keyword.trim();
  let whereClause = 'WHERE p.deleted_at IS NULL AND p.status = \'published\'';
  const params = [];
  let idx = 1;

  // 全文匹配
  whereClause += ` AND (p.title ILIKE $${idx++} OR p.content ILIKE $${idx++})`;
  params.push(`%${searchTerm}%`, `%${searchTerm}%`);

  if (sectionId) { whereClause += ` AND p.section_id = $${idx++}`; params.push(sectionId); }
  if (type) { whereClause += ` AND p.type = $${idx++}`; params.push(type); }
  if (authorId) { whereClause += ` AND p.author_id = $${idx++}`; params.push(authorId); }
  if (tag) { whereClause += ` AND p.tags @> $${idx++}`; params.push(JSON.stringify([tag])); }

  // 相关度排序需要复用标题匹配参数
  const titleMatchIdx = 1; // $1 即 title ILIKE 参数
  const orderBy = sortBy === 'latest'
    ? 'p.created_at DESC'
    : sortBy === 'hot'
      ? 'p.hot_score DESC, p.created_at DESC'
      : `CASE WHEN p.title ILIKE $${titleMatchIdx} THEN 0 ELSE 1 END, p.hot_score DESC, p.created_at DESC`;

  const countRes = await repo.rawQuery(`SELECT COUNT(*) as total FROM posts p ${whereClause}`, params);
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * pageSize;
  const res = await repo.rawQuery(
    `SELECT * FROM posts p ${whereClause} ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx}`,
    [...params, pageSize, offset]
  );

  const list = res.rows.map(r => {
    const post = repo.toCamelCase(r);
    return {
      ...sanitizePost(post),
      highlightTitle: highlightText(post.title, searchTerm),
      highlightContent: highlightText(post.content?.substring(0, 300) || '', searchTerm),
    };
  });

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}

// 高亮匹配文本（先 HTML 转义防 XSS，再插入 mark 标签）
function highlightText(text, keyword) {
  if (!text || !keyword) return text;
  const htmlEscaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return htmlEscaped.replace(regex, '<mark>$1</mark>');
}

// 清理帖子敏感信息
function sanitizePost(post) {
  return {
    ...post,
  };
}
