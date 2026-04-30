import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors.js';

// ========== 榜单 ==========

/**
 * 获取排行榜
 */
export async function getRankings(options = {}) {
  const { rankType = 'hot', period = 'weekly', targetType, page = 1, limit = 20 } = options;

  const where = { rankType, period };
  if (targetType) where.targetType = Number(targetType);
  const result = await repo.findAll('rankings', {
    where,
    page,
    limit,
    orderBy: 'rank_no ASC',
  });

  const items = [];
  for (const r of result.list) {
    let target = null;
    if (r.targetType === 1) {
      const p = await repo.rawQuery(
        'SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL',
        [r.targetId]
      );
      target = p.rows && p.rows.length > 0 ? repo.toCamelCase(p.rows[0]) : null;
    } else if (r.targetType === 2) {
      const u = await repo.rawQuery(
        'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
        [r.targetId]
      );
      target = u.rows && u.rows.length > 0 ? repo.toCamelCase(u.rows[0]) : null;
    }
    items.push({ ...r, target });
  }

  return { total: result.total, page, limit, rankType, period, list: items };
}

/**
 * 计算并更新排行榜
 */
export async function calculateRankings(rankType, period, targetType = 1) {
  // 移除旧的同类排行
  await repo.hardDelete('rankings', { rankType, period, targetType });

  let items = [];
  const now = new Date().toISOString();

  if (targetType === 1) {
    // 帖子排行
    const posts = await repo.rawQuery(
      "SELECT * FROM posts WHERE deleted_at IS NULL AND status = 2"
    );
    items = posts.rows.map(p => {
      const row = repo.toCamelCase(p);
      return {
        id: generateId(),
        rankType,
        targetType: 1,
        targetId: row.id,
        score: Number(row.hotScore || 0) + (row.likeCount || 0) * 2 + (row.commentCount || 0) * 3 + (row.viewCount || 0) * 0.1,
        rankNo: 0,
        period,
        calculatedAt: now,
      };
    });
  } else if (targetType === 2) {
    // 用户排行
    const users = await repo.rawQuery(
      'SELECT * FROM users WHERE deleted_at IS NULL'
    );
    items = users.rows.map(u => {
      const row = repo.toCamelCase(u);
      return {
        id: generateId(),
        rankType,
        targetType: 2,
        targetId: row.id,
        score: (row.followerCount || 0) * 5 + (row.postCount || 0) * 3,
        rankNo: 0,
        period,
        calculatedAt: now,
      };
    });
  }

  items.sort((a, b) => b.score - a.score);
  items.forEach((item, index) => {
    item.rankNo = index + 1;
  });

  // 只保留前100
  const top100 = items.slice(0, 100);
  await repo.batchInsert('rankings', top100);

  return { success: true, count: top100.length, rankType, period, targetType };
}

// ========== 必看榜单 ==========

/**
 * 获取必看列表
 */
export async function getMustSeeList(options = {}) {
  const { page = 1, limit = 20 } = options;

  const now = new Date().toISOString();
  const result = await repo.rawQuery(
    `SELECT * FROM must_see_list
     WHERE deleted_at IS NULL
     ORDER BY sort_order ASC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM must_see_list
     WHERE deleted_at IS NULL`,
    []
  );
  const total = Number(countRes.rows[0].total);

  const items = [];
  for (const row of result.rows) {
    const item = repo.toCamelCase(row);
    const post = await repo.rawQuery(
      'SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [item.targetId]
    );
    items.push({
      ...item,
      post: post.rows && post.rows.length > 0 ? repo.toCamelCase(post.rows[0]) : null,
    });
  }

  return { total, page, limit, list: items };
}

/**
 * 添加必看帖子
 */
export async function addMustSeeItem(data) {
  if (!data.targetId) throw new ValidationError('缺少目标ID');
  if (!data.addedBy) throw new ValidationError('缺少添加人ID');

  const postRes = await repo.rawQuery(
    'SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [data.targetId]
  );
  if (!postRes.rows || postRes.rows.length === 0) throw new NotFoundError('帖子不存在');

  const existing = await repo.findOne('must_see_list', { targetId: data.targetId, deletedAt: null });
  if (existing) throw new ConflictError('该帖子已在必看列表中');

  const post = repo.toCamelCase(postRes.rows[0]);
  const item = await repo.insert('must_see_list', {
    id: generateId(),
    targetType: data.targetType || 1,
    targetId: data.targetId,
    title: data.title || post.title || '',
    coverImage: data.coverImage || post.coverImage || '',
    description: data.description || '',
    sortOrder: data.sortOrder || 0,
    addedBy: data.addedBy,
    createdAt: new Date().toISOString(),
  });

  return { success: true, item };
}

/**
 * 删除必看帖子
 */
export async function removeMustSeeItem(id) {
  await repo.remove('must_see_list', id);
  return { success: true };
}

// ========== 公告 ==========

/**
 * 获取公告列表
 */
export async function getAnnouncements(options = {}) {
  const { type, page = 1, limit = 20 } = options;

  const now = new Date().toISOString();

  // 使用 rawQuery 做时间范围过滤和复杂排序
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  let idx = 1;

  if (type) {
    conditions.push(`type = $${idx}`);
    params.push(Number(type));
    idx++;
  }
  conditions.push(`(start_time IS NULL OR start_time <= $${idx})`);
  params.push(now);
  idx++;
  conditions.push(`(end_time IS NULL OR end_time >= $${idx})`);
  params.push(now);
  idx++;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM announcements ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * limit;
  const res = await repo.rawQuery(
    `SELECT * FROM announcements ${whereClause}
     ORDER BY is_sticky DESC, priority DESC, created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  const list = res.rows.map(row => repo.toCamelCase(row));
  return { total, page, limit, list };
}

/**
 * 创建公告
 */
export async function createAnnouncement(data) {
  if (!data.title) throw new ValidationError('缺少公告标题');
  if (!data.content) throw new ValidationError('缺少公告内容');
  if (!data.createdBy) throw new ValidationError('缺少创建人ID');

  const item = await repo.insert('announcements', {
    id: generateId(),
    title: data.title,
    content: data.content,
    type: data.type || 1,
    priority: data.priority || 0,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    isSticky: data.isSticky || 0,
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  });
  return { success: true, item };
}

/**
 * 更新公告
 */
export async function updateAnnouncement(id, data) {
  const item = await repo.findOne('announcements', { id, deletedAt: null });
  if (!item) throw new NotFoundError('公告不存在');

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.isSticky !== undefined) updateData.isSticky = data.isSticky;
  updateData.updatedAt = new Date().toISOString();

  const updated = await repo.update('announcements', id, updateData);
  return { success: true, item: updated };
}

/**
 * 删除公告
 */
export async function deleteAnnouncement(id) {
  await repo.remove('announcements', id);
  return { success: true };
}
