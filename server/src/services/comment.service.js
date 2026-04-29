import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError } from '../lib/errors.js';
import { emitNewComment } from '../lib/websocket.js';
import { createNotification } from './notification.service.js';

// 获取评论列表
export async function getCommentList(options = {}) {
  const { postId, page = 1, pageSize = 20, sortBy = 'latest' } = options;

  const orderBy = sortBy === 'hot' ? 'c.like_count DESC' : 'c.created_at DESC';

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM comments c WHERE c.deleted_at IS NULL AND c.post_id = $1 AND c.parent_id IS NULL`,
    [postId]
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * pageSize;
  const res = await repo.rawQuery(
    `SELECT * FROM comments c WHERE c.deleted_at IS NULL AND c.post_id = $1 AND c.parent_id IS NULL ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
    [postId, pageSize, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r)).map(sanitizeComment);

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}

// 获取评论详情
export async function getCommentById(id) {
  const comment = await repo.findOne('comments', { id, deletedAt: null });
  if (!comment) {
    throw new NotFoundError('评论不存在');
  }
  return sanitizeComment(comment);
}

// 创建评论
export async function createComment(data) {
  // 查找父评论的 rootId
  let rootId = null;
  if (data.parentId) {
    const parent = await repo.findById('comments', data.parentId);
    if (parent) {
      rootId = parent.rootId || null;
    }
  }

  // 检查是否是作者
  const post = await repo.findById('posts', data.postId);
  const isAuthor = post && post.authorId === data.authorId;

  const comment = {
    id: generateId(),
    postId: data.postId,
    parentId: data.parentId,
    rootId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorAvatar: data.authorAvatar,
    content: data.content,
    images: data.images || [],
    likeCount: 0,
    dislikeCount: 0,
    replyCount: 0,
    isAuthor,
    isTop: false,
    isEssence: false,
    replyToUserId: data.replyToUserId,
    replyToUsername: data.replyToUsername,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('comments', comment);

  // 更新帖子评论数
  if (post) {
    await repo.increment('posts', data.postId, 'commentCount', 1);
  }

  // 如果是回复，增加父评论的回复数
  if (data.parentId) {
    await repo.increment('comments', data.parentId, 'replyCount', 1);
  }

  // 通过 WebSocket 广播新评论
  emitNewComment(data.postId, sanitizeComment(comment));

  // 通知帖子作者（评论通知 type=2）
  try {
    if (post && post.authorId !== data.authorId) {
      await createNotification({
        userId: post.authorId,
        type: 2,
        title: '评论通知',
        content: `${data.authorName} 评论了你的帖子`,
        sourceUserId: data.authorId,
        targetType: 1,
        targetId: data.postId,
        relatedId: comment.id,
      });
    }
  } catch (e) { console.error('[通知] 评论通知失败:', e.message); }

  // 通知被回复者（如果 parentId 存在）
  try {
    if (data.parentId && data.replyToUserId && data.replyToUserId !== data.authorId) {
      await createNotification({
        userId: data.replyToUserId,
        type: 2,
        title: '回复通知',
        content: `${data.authorName} 回复了你`,
        sourceUserId: data.authorId,
        targetType: 2,
        targetId: comment.id,
        relatedId: data.postId,
      });
    }
  } catch (e) { console.error('[通知] 回复通知失败:', e.message); }

  return sanitizeComment(comment);
}

// 删除评论
export async function deleteComment(id) {
  const comment = await repo.findById('comments', id);
  if (!comment) {
    throw new NotFoundError('评论不存在');
  }

  await repo.remove('comments', id);
  return true;
}

// 点赞评论
export async function likeComment(id, userId) {
  const comment = await repo.findById('comments', id);
  if (!comment) {
    throw new NotFoundError('评论不存在');
  }

  // 检查是否已点赞
  const existingLike = await repo.findOne('user_relationships', {
    type: 4,
    targetId: id,
    userId,
  });

  if (existingLike && !existingLike.deleted) {
    // 取消点赞 — 使用原子递减避免竞态
    const updated = await repo.increment('comments', id, 'likeCount', -1);
    await repo.update('user_relationships', existingLike.id, { deleted: true });
    const likeCount = Math.max(0, updated?.likeCount ?? comment.likeCount - 1);
    return { likeCount, isLiked: false };
  } else {
    // 添加点赞 — 使用原子递增避免竞态
    const updated = await repo.increment('comments', id, 'likeCount', 1);
    await repo.insert('user_relationships', {
      id: generateId(),
      type: 4,
      userId,
      targetId: id,
      createdAt: new Date().toISOString(),
    });
    return { likeCount: updated?.likeCount ?? comment.likeCount + 1, isLiked: true };
  }
}

// 获取子评论列表
export async function getCommentReplies(parentId, options = {}) {
  const { page = 1, pageSize = 50 } = options;

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM comments WHERE deleted_at IS NULL AND parent_id = $1`,
    [parentId]
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * pageSize;
  const res = await repo.rawQuery(
    `SELECT * FROM comments WHERE deleted_at IS NULL AND parent_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
    [parentId, pageSize, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r)).map(sanitizeComment);

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}

// 清理评论敏感信息
function sanitizeComment(comment) {
  return {
    ...comment,
  };
}
