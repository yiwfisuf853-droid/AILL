import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError } from '../lib/errors.js';

// 创建热点话题
export async function createHotTopic(data) {
  const topic = {
    id: generateId(),
    title: data.title,
    description: data.description || null,
    heatScore: 0,
    status: data.status ?? 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repo.insert('hot_topics', topic);
  return topic;
}

// 获取热点话题列表
export async function getHotTopics({ page = 1, limit = 20, status } = {}) {
  let whereClause = 'WHERE deleted_at IS NULL';
  const params = [];
  let idx = 1;

  if (status !== undefined) {
    whereClause += ` AND status = $${idx++}`;
    params.push(status);
  }

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM hot_topics ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * limit;
  const res = await repo.rawQuery(
    `SELECT * FROM hot_topics ${whereClause} ORDER BY heat_score DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r));

  return { list, total, page, limit, hasMore: offset + limit < total };
}

// 获取单个热点话题
export async function getHotTopicById(id) {
  const topic = await repo.findById('hot_topics', id);
  if (!topic) {
    throw new NotFoundError('热点话题不存在');
  }
  return topic;
}

// 更新热点话题
export async function updateHotTopic(id, data) {
  const topic = await repo.findById('hot_topics', id);
  if (!topic) {
    throw new NotFoundError('热点话题不存在');
  }

  const updated = await repo.update('hot_topics', id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

// 删除热点话题（软删除）
export async function deleteHotTopic(id) {
  const topic = await repo.findById('hot_topics', id);
  if (!topic) {
    throw new NotFoundError('热点话题不存在');
  }

  await repo.update('hot_topics', id, {
    deletedAt: new Date().toISOString(),
  });
  return true;
}

// 帖子关联热点
export async function affiliatePostWithTopic(postId, topicId) {
  const topic = await repo.findById('hot_topics', topicId);
  if (!topic) {
    throw new NotFoundError('热点话题不存在');
  }

  const affiliation = {
    id: generateId(),
    postId,
    hotTopicId: topicId,
    createdAt: new Date().toISOString(),
  };

  await repo.insert('post_hot_affiliations', affiliation);
  return affiliation;
}

// 移除帖子关联
export async function removePostAffiliation(postId, topicId) {
  await repo.rawQuery(
    `DELETE FROM post_hot_affiliations WHERE post_id = $1 AND hot_topic_id = $2`,
    [postId, topicId]
  );
  return true;
}

// 查询热点关联的帖子
export async function getTopicPosts(topicId, { page = 1, limit = 20 } = {}) {
  const topic = await repo.findById('hot_topics', topicId);
  if (!topic) {
    throw new NotFoundError('热点话题不存在');
  }

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM post_hot_affiliations WHERE hot_topic_id = $1`,
    [topicId]
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * limit;
  const res = await repo.rawQuery(
    `SELECT p.* FROM posts p
     INNER JOIN post_hot_affiliations pha ON p.id = pha.post_id
     WHERE pha.hot_topic_id = $1 AND p.deleted_at IS NULL
     ORDER BY pha.created_at DESC
     LIMIT $2 OFFSET $3`,
    [topicId, limit, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r));

  return { list, total, page, limit, hasMore: offset + limit < total };
}
