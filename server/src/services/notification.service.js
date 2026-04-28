import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError } from '../lib/errors.js';
import { emitNotification } from '../lib/websocket.js';

/**
 * 获取通知列表
 */
export async function getNotifications(userId, options = {}) {
  const { isRead, page = 1, limit = 20 } = options;

  let whereClause = 'WHERE n.user_id = $1 AND n.deleted_at IS NULL';
  const params = [userId];
  let idx = 2;

  if (isRead !== undefined) {
    whereClause += ` AND n.is_read = $${idx++}`;
    // 前端可能传 boolean true/false，PG 存储为 0/1
    params.push(isRead === true ? 1 : isRead === false ? 0 : isRead);
  }

  const countRes = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM notifications n ${whereClause}`,
    params
  );
  const total = Number(countRes.rows[0].total);

  const offset = (page - 1) * limit;
  const res = await repo.rawQuery(
    `SELECT n.* FROM notifications n ${whereClause} ORDER BY n.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  // 批量查询关联的 sourceUser
  const sourceUserIds = res.rows
    .map(r => repo.toCamelCase(r))
    .filter(n => n.sourceUserId)
    .map(n => n.sourceUserId);

  const sourceUserMap = {};
  if (sourceUserIds.length > 0) {
    const uniqueIds = [...new Set(sourceUserIds)];
    const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(',');
    const usersRes = await repo.rawQuery(
      `SELECT id, username, avatar, is_ai FROM users WHERE id IN (${placeholders})`,
      uniqueIds
    );
    for (const row of usersRes.rows) {
      const u = repo.toCamelCase(row);
      sourceUserMap[u.id] = u;
    }
  }

  const list = res.rows.map(r => {
    const notification = repo.toCamelCase(r);
    const sourceUser = notification.sourceUserId ? sourceUserMap[notification.sourceUserId] : null;
    return {
      id: notification.id,
      type: notification.type,
      typeName: getTypeName(notification.type),
      content: notification.content,
      sourceUser: sourceUser ? {
        id: sourceUser.id,
        username: sourceUser.username,
        avatar: sourceUser.avatar,
        isAi: sourceUser.isAi,
      } : null,
      targetType: notification.targetType,
      targetId: notification.targetId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  });

  return {
    total,
    page,
    limit,
    hasMore: offset + limit < total,
    list,
  };
}

/**
 * 标记为已读
 */
export async function markAsRead(notificationId) {
  const notification = await repo.findById('notifications', notificationId);
  if (!notification) {
    throw new NotFoundError('通知不存在');
  }

  await repo.update('notifications', notificationId, {
    isRead: 1,
    readAt: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * 全部标记为已读
 */
export async function markAllAsRead(userId) {
  const res = await repo.rawQuery(
    `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = $1 AND is_read = 0 AND deleted_at IS NULL`,
    [userId]
  );

  return {
    success: true,
    count: res.rowCount,
  };
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId) {
  const notification = await repo.findById('notifications', notificationId);
  if (!notification) {
    throw new NotFoundError('通知不存在');
  }

  await repo.remove('notifications', notificationId);

  return { success: true };
}

/**
 * 获取通知类型名称
 */
function getTypeName(type) {
  const names = {
    1: '点赞',
    2: '评论',
    3: '关注',
    4: '系统',
    5: '活动',
    6: '订阅',
  };
  return names[type] || '未知';
}

/**
 * 创建通知 (内部使用)
 */
export async function createNotification(data) {
  const notification = {
    id: generateId(),
    ...data,
    isRead: 0,
    createdAt: new Date().toISOString(),
  };

  await repo.insert('notifications', notification);
  emitNotification(notification.userId, notification);
  return notification;
}
