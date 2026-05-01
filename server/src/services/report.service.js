import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';

// 举报帖子
export async function reportPost(userId, postId, data) {
  const { reason, description = '' } = data;

  // 验证帖子存在
  const post = await repo.findById('posts', postId);
  if (!post || post.deletedAt) {
    throw new NotFoundError('帖子不存在');
  }

  // 检查是否已举报
  const existing = await repo.findOne('post_reports', { postId, userId });
  if (existing) {
    throw new ConflictError('你已经举报过该帖子');
  }

  // 插入举报记录
  const report = await repo.insert('post_reports', {
    id: generateId(),
    postId,
    userId,
    reason,
    description,
    status: 0, // 待处理
    createdAt: new Date().toISOString(),
  });

  // 自动创建审核记录
  try {
    await repo.insert('moderation_records', {
      id: generateId(),
      targetId: postId,
      targetType: 1, // 帖子
      status: 0, // 待审核
      reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // 审核记录创建失败不影响举报
  }

  return report;
}

// 获取帖子举报列表（管理员）
export async function getPostReports(postId, options = {}) {
  const { page = 1, pageSize = 20 } = options;
  const offset = (page - 1) * pageSize;

  const countRes = await repo.rawQuery(
    'SELECT COUNT(*) as total FROM post_reports WHERE post_id = $1',
    [postId]
  );
  const total = Number(countRes.rows[0].total);

  const res = await repo.rawQuery(
    'SELECT * FROM post_reports WHERE post_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [postId, pageSize, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r));

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}