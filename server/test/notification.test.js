import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearDatabase } from '../src/models/db.js';
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../src/services/notification.service.js';
import { NotFoundError } from '../src/lib/errors.js';

describe('Notification Service', () => {
  let userId;

  beforeEach(() => {
    clearDatabase();
    userId = 'notify-user-001';

    // 准备用户数据（getNotifications 会查找 sourceUser）
    db.users.push({
      id: userId,
      username: 'notifyuser',
      avatar: null,
      isAi: false,
    });
    db.users.push({
      id: 'source-user-001',
      username: 'sourceuser',
      avatar: 'http://avatar.jpg',
      isAi: false,
    });
  });

  describe('createNotification', () => {
    it('should create a notification', () => {
      const notification = createNotification({
        userId,
        type: 1,
        content: 'Someone liked your post',
        sourceUserId: 'source-user-001',
        targetType: 1,
        targetId: 'post-001',
      });

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(userId);
      expect(notification.type).toBe(1);
      expect(notification.content).toBe('Someone liked your post');
      expect(notification.isRead).toBe(0);
      expect(notification.createdAt).toBeDefined();
      expect(db.notifications).toHaveLength(1);
    });

    it('should initialize notifications array if not exists', () => {
      delete db.notifications;

      createNotification({
        userId,
        type: 4,
        content: 'System notification',
      });

      expect(Array.isArray(db.notifications)).toBe(true);
      expect(db.notifications).toHaveLength(1);
    });

    it('should create notification without sourceUserId', () => {
      const notification = createNotification({
        userId,
        type: 4,
        content: 'System message',
      });

      expect(notification.sourceUserId).toBeUndefined();
    });

    it('should create multiple notifications for same user', () => {
      createNotification({ userId, type: 1, content: 'N1' });
      createNotification({ userId, type: 2, content: 'N2' });
      createNotification({ userId, type: 3, content: 'N3' });

      expect(db.notifications).toHaveLength(3);
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for a user', async () => {
      createNotification({ userId, type: 1, content: 'Like', sourceUserId: 'source-user-001' });
      createNotification({ userId, type: 2, content: 'Comment', sourceUserId: 'source-user-001' });

      const result = await getNotifications(userId);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty list for user with no notifications', async () => {
      const result = await getNotifications('no-notifications-user');

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should not return other users notifications', async () => {
      createNotification({ userId, type: 1, content: 'Mine' });
      createNotification({ userId: 'other-user', type: 1, content: 'Theirs' });

      const result = await getNotifications(userId);
      expect(result.total).toBe(1);
      expect(result.list[0].content).toBe('Mine');
    });

    it('should filter by isRead status', async () => {
      const n1 = createNotification({ userId, type: 1, content: 'Read' });
      createNotification({ userId, type: 1, content: 'Unread' });

      // 标记一个为已读
      await markAsRead(n1.id);

      const readResult = await getNotifications(userId, { isRead: 1 });
      expect(readResult.total).toBe(1);
      expect(readResult.list[0].content).toBe('Read');

      const unreadResult = await getNotifications(userId, { isRead: 0 });
      expect(unreadResult.total).toBe(1);
      expect(unreadResult.list[0].content).toBe('Unread');
    });

    it('should return paginated results', async () => {
      for (let i = 0; i < 25; i++) {
        createNotification({ userId, type: 1, content: `Notification ${i}` });
      }

      const result = await getNotifications(userId, { page: 1, limit: 10 });
      expect(result.list).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
    });

    it('should return correct page 2', async () => {
      for (let i = 0; i < 15; i++) {
        createNotification({ userId, type: 1, content: `N ${i}` });
      }

      const result = await getNotifications(userId, { page: 2, limit: 10 });
      expect(result.list).toHaveLength(5);
      expect(result.hasMore).toBe(false);
    });

    it('should sort by createdAt descending', async () => {
      createNotification({ userId, type: 1, content: 'First' });
      createNotification({ userId, type: 1, content: 'Second' });
      createNotification({ userId, type: 1, content: 'Third' });

      // 手动设置不同的 createdAt 以保证排序确定性
      const now = Date.now();
      db.notifications[0].createdAt = new Date(now - 2000).toISOString();
      db.notifications[1].createdAt = new Date(now - 1000).toISOString();
      db.notifications[2].createdAt = new Date(now).toISOString();

      const result = await getNotifications(userId);
      expect(result.list[0].content).toBe('Third');
      expect(result.list[2].content).toBe('First');
    });

    it('should exclude deleted notifications', async () => {
      const n1 = createNotification({ userId, type: 1, content: 'Active' });
      createNotification({ userId, type: 1, content: 'ToDelete' });
      await deleteNotification(n1.id);

      const result = await getNotifications(userId);
      expect(result.total).toBe(1);
      expect(result.list[0].content).toBe('ToDelete');
    });

    it('should include sourceUser info', async () => {
      createNotification({
        userId,
        type: 1,
        content: 'Like',
        sourceUserId: 'source-user-001',
      });

      const result = await getNotifications(userId);
      expect(result.list[0].sourceUser).toBeDefined();
      expect(result.list[0].sourceUser.username).toBe('sourceuser');
      expect(result.list[0].sourceUser.avatar).toBe('http://avatar.jpg');
    });

    it('should have null sourceUser when no sourceUserId', async () => {
      createNotification({ userId, type: 4, content: 'System' });

      const result = await getNotifications(userId);
      expect(result.list[0].sourceUser).toBeNull();
    });

    it('should include typeName based on type', async () => {
      createNotification({ userId, type: 1, content: 'Like' });
      createNotification({ userId, type: 2, content: 'Comment' });
      createNotification({ userId, type: 3, content: 'Follow' });
      createNotification({ userId, type: 4, content: 'System' });

      const result = await getNotifications(userId);
      const types = result.list.map(n => n.typeName);
      expect(types).toContain('点赞');
      expect(types).toContain('评论');
      expect(types).toContain('关注');
      expect(types).toContain('系统');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = createNotification({ userId, type: 1, content: 'Test' });
      expect(notification.isRead).toBe(0);

      const result = await markAsRead(notification.id);

      expect(result.success).toBe(true);
      expect(result.notification.isRead).toBe(1);
      expect(result.notification.readAt).toBeDefined();
    });

    it('should throw NotFoundError for non-existent notification', async () => {
      await expect(markAsRead('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should persist read state', async () => {
      const notification = createNotification({ userId, type: 1, content: 'Test' });
      await markAsRead(notification.id);

      const result = await getNotifications(userId, { isRead: 1 });
      expect(result.total).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      createNotification({ userId, type: 1, content: 'N1' });
      createNotification({ userId, type: 2, content: 'N2' });
      createNotification({ userId, type: 3, content: 'N3' });

      const result = await markAllAsRead(userId);

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);

      // Verify all are read
      const unread = await getNotifications(userId, { isRead: 0 });
      expect(unread.total).toBe(0);
    });

    it('should not mark other users notifications', async () => {
      createNotification({ userId, type: 1, content: 'Mine' });
      createNotification({ userId: 'other-user', type: 1, content: 'Theirs' });

      await markAllAsRead(userId);

      // Other user notification should still be unread
      const otherNotification = db.notifications.find(n => n.userId === 'other-user');
      expect(otherNotification.isRead).toBe(0);
    });

    it('should return count 0 when no unread notifications', async () => {
      const result = await markAllAsRead(userId);
      expect(result.count).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should soft delete a notification', async () => {
      const notification = createNotification({ userId, type: 1, content: 'Delete me' });
      const result = await deleteNotification(notification.id);

      expect(result.success).toBe(true);

      const found = db.notifications.find(n => n.id === notification.id);
      expect(found.deletedAt).toBeDefined();
    });

    it('should throw NotFoundError for non-existent notification', async () => {
      await expect(deleteNotification('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should make notification invisible in getNotifications', async () => {
      const n1 = createNotification({ userId, type: 1, content: 'Keep' });
      createNotification({ userId, type: 1, content: 'Remove' });
      await deleteNotification(n1.id);

      const result = await getNotifications(userId);
      expect(result.total).toBe(1);
      expect(result.list[0].content).toBe('Remove');
    });
  });
});
