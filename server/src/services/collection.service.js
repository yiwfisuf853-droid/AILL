import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors.js';

// ========== 合集 ==========

/**
 * 获取合集列表
 */
export async function getCollections(options = {}) {
  const { userId, page = 1, limit = 20 } = options;

  const conditions = ['c.deleted_at IS NULL'];
  const params = [];
  let idx = 1;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM collections c ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * limit;
  const res = await repo.rawQuery(
    `SELECT c.* FROM collections c ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  const list = res.rows.map(row => repo.toCamelCase(row));

  return { total, page, limit, list };
}

/**
 * 获取合集详情
 */
export async function getCollectionDetail(id) {
  const collectionRes = await repo.rawQuery(
    'SELECT * FROM collections WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!collectionRes.rows || collectionRes.rows.length === 0) throw new NotFoundError('合集不存在');
  const collection = repo.toCamelCase(collectionRes.rows[0]);

  // 获取合集内的帖子
  const cpRes = await repo.rawQuery(
    'SELECT * FROM collection_posts WHERE collection_id = $1 ORDER BY sort_order ASC',
    [id]
  );

  const posts = [];
  for (const cpRow of cpRes.rows) {
    const cp = repo.toCamelCase(cpRow);
    const postRes = await repo.rawQuery(
      'SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [cp.postId]
    );
    const post = postRes.rows && postRes.rows.length > 0 ? repo.toCamelCase(postRes.rows[0]) : null;
    posts.push({ ...cp, post });
  }

  // 获取合集标签
  const ctRes = await repo.rawQuery(
    'SELECT * FROM collection_tags WHERE collection_id = $1',
    [id]
  );

  const tags = ctRes.rows.map(row => repo.toCamelCase(row).tag).filter(Boolean);

  // 获取作者
  const user = await repo.findById('users', collection.userId);

  return {
    ...collection,
    author: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
    posts,
    tags,
  };
}

/**
 * 创建合集
 */
export async function createCollection(data) {
  const title = data.title || data.name;
  if (!title) throw new ValidationError('缺少合集标题');
  if (!data.userId) throw new ValidationError('缺少用户ID');

  const user = await repo.findById('users', data.userId);
  if (!user) throw new NotFoundError('用户不存在');

  const item = await repo.insert('collections', {
    id: generateId(),
    name: title,
    description: data.description || '',
    coverImage: data.coverImage || '',
    userId: data.userId,
    type: data.type || 1,
    visibility: data.visibility || 1,
    postCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { success: true, item };
}

/**
 * 更新合集
 */
export async function updateCollection(id, data) {
  const item = await repo.findOne('collections', { id, deletedAt: null });
  if (!item) throw new NotFoundError('合集不存在');

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
  if (data.status !== undefined) updateData.status = data.status;
  updateData.updatedAt = new Date().toISOString();

  const updated = await repo.update('collections', id, updateData);
  return { success: true, item: updated };
}

/**
 * 删除合集
 */
export async function deleteCollection(id) {
  await repo.remove('collections', id);
  return { success: true };
}

// ========== 合集帖子 ==========

/**
 * 添加帖子到合集
 */
export async function addPostToCollection(collectionId, data) {
  if (!data.postId) throw new ValidationError('缺少帖子ID');

  const collection = await repo.findOne('collections', { id: collectionId, deletedAt: null });
  if (!collection) throw new NotFoundError('合集不存在');

  const post = await repo.rawQuery(
    'SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [data.postId]
  );
  if (!post.rows || post.rows.length === 0) throw new NotFoundError('帖子不存在');

  const existing = await repo.findOne('collection_posts', { collectionId, postId: data.postId });
  if (existing) throw new ConflictError('该帖子已在此合集中');

  const item = await repo.insert('collection_posts', {
    id: generateId(),
    collectionId,
    postId: data.postId,
    sortOrder: data.sortOrder || collection.postCount,
    addedAt: new Date().toISOString(),
  });

  await repo.increment('collections', collectionId, 'postCount', 1);
  await repo.update('collections', collectionId, { updatedAt: new Date().toISOString() });

  return { success: true, item };
}

/**
 * 从合集中移除帖子
 */
export async function removePostFromCollection(collectionId, postId) {
  const cpRes = await repo.rawQuery(
    'SELECT * FROM collection_posts WHERE collection_id = $1 AND post_id = $2',
    [collectionId, postId]
  );
  if (!cpRes.rows || cpRes.rows.length === 0) throw new NotFoundError('该帖子不在此合集中');

  const cpItem = cpRes.rows[0];
  await repo.hardDelete('collection_posts', { id: repo.toCamelCase(cpItem).id });

  const collection = await repo.findById('collections', collectionId);
  if (collection) {
    await repo.increment('collections', collectionId, 'postCount', -1);
    await repo.update('collections', collectionId, { updatedAt: new Date().toISOString() });
  }

  return { success: true };
}

// ========== 合集标签 ==========

/**
 * 添加标签到合集
 */
export async function addTagToCollection(collectionId, data) {
  if (!data.tag) throw new ValidationError('缺少标签名称');

  const collection = await repo.findOne('collections', { id: collectionId, deletedAt: null });
  if (!collection) throw new NotFoundError('合集不存在');

  const existing = await repo.findOne('collection_tags', { collectionId, tag: data.tag });
  if (existing) throw new ConflictError('该标签已关联此合集');

  const item = await repo.insert('collection_tags', {
    id: generateId(),
    collectionId,
    tag: data.tag,
  });

  return { success: true, item };
}

/**
 * 从合集移除标签
 */
export async function removeTagFromCollection(collectionId, tag) {
  const ctRes = await repo.rawQuery(
    'SELECT * FROM collection_tags WHERE collection_id = $1 AND tag = $2',
    [collectionId, tag]
  );
  if (!ctRes.rows || ctRes.rows.length === 0) throw new NotFoundError('该标签未关联此合集');

  const ctItem = repo.toCamelCase(ctRes.rows[0]);
  await repo.hardDelete('collection_tags', { id: ctItem.id });

  return { success: true };
}
