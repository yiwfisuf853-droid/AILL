import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../src/lib/errors.js';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  insert: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toCamelCase: vi.fn((row) => {
    if (!row || typeof row !== 'object') return row;
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      output[key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] = value;
    }
    return output;
  }),
}));

vi.mock('../src/models/repository.js', () => repoMock);
vi.mock('../src/lib/websocket.js', () => ({
  emitNotification: vi.fn(),
}));

import {
  createNotification,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../src/services/notification.service.js';
import { emitNotification } from '../src/lib/websocket.js';

function createNotificationRecord(overrides = {}) {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 1,
    content: 'Someone liked your post',
    sourceUserId: 'source-1',
    targetType: 1,
    targetId: 'post-1',
    isRead: 0,
    createdAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('Notification Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.rawQuery.mockResolvedValue({ rows: [] });
    repoMock.findById.mockResolvedValue(null);
  });

  it('createNotification should insert notification and emit websocket event', async () => {
    repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

    const notification = await createNotification({
      userId: 'user-1',
      type: 1,
      content: 'Someone liked your post',
      sourceUserId: 'source-1',
      targetType: 1,
      targetId: 'post-1',
    });

    expect(notification.id).toBeDefined();
    expect(notification.userId).toBe('user-1');
    expect(notification.isRead).toBe(0);
    expect(notification.createdAt).toBeDefined();
    expect(repoMock.insert).toHaveBeenCalledWith('notifications', expect.objectContaining({
      userId: 'user-1',
      type: 1,
      content: 'Someone liked your post',
      isRead: 0,
    }));
    expect(emitNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
      content: 'Someone liked your post',
    }));
  });

  it('getNotifications should query current user notifications with pagination and source users', async () => {
    repoMock.rawQuery
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({ rows: [
        {
          id: 'notification-2',
          user_id: 'user-1',
          type: 2,
          content: 'Comment',
          source_user_id: 'source-1',
          target_type: 1,
          target_id: 'post-1',
          is_read: 0,
          created_at: '2026-05-07T01:00:00.000Z',
        },
        {
          id: 'notification-1',
          user_id: 'user-1',
          type: 4,
          content: 'System',
          source_user_id: null,
          target_type: null,
          target_id: null,
          is_read: 1,
          created_at: '2026-05-07T00:00:00.000Z',
        },
      ] })
      .mockResolvedValueOnce({ rows: [
        { id: 'source-1', username: 'sourceuser', avatar: '/avatar.png', is_ai: false },
      ] });

    const result = await getNotifications('user-1', { page: 2, limit: 5 });

    expect(result.total).toBe(2);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.hasMore).toBe(false);
    expect(result.list).toEqual([
      {
        id: 'notification-2',
        type: 2,
        typeName: '评论',
        content: 'Comment',
        sourceUser: { id: 'source-1', username: 'sourceuser', avatar: '/avatar.png', isAi: false },
        targetType: 1,
        targetId: 'post-1',
        isRead: 0,
        createdAt: '2026-05-07T01:00:00.000Z',
      },
      {
        id: 'notification-1',
        type: 4,
        typeName: '系统',
        content: 'System',
        sourceUser: null,
        targetType: null,
        targetId: null,
        isRead: 1,
        createdAt: '2026-05-07T00:00:00.000Z',
      },
    ]);
    expect(repoMock.rawQuery.mock.calls[0][0]).toContain('n.user_id = $1');
    expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY n.created_at DESC');
    expect(repoMock.rawQuery.mock.calls[1][1]).toEqual(['user-1', 5, 5]);
    expect(repoMock.rawQuery.mock.calls[2][0]).toContain('WHERE id IN ($1)');
    expect(repoMock.rawQuery.mock.calls[2][1]).toEqual(['source-1']);
  });

  it('getNotifications should support isRead and type filters with safe params', async () => {
    repoMock.rawQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getNotifications('user-1', { isRead: false, type: 6, page: 1, limit: 10 });

    expect(result.total).toBe(0);
    expect(repoMock.rawQuery.mock.calls[0][0]).toContain('n.is_read = $2');
    expect(repoMock.rawQuery.mock.calls[0][0]).toContain('n.type = $3');
    expect(repoMock.rawQuery.mock.calls[0][1]).toEqual(['user-1', 0, 6]);
    expect(repoMock.rawQuery.mock.calls[1][1]).toEqual(['user-1', 0, 6, 10, 0]);
  });

  it('getNotifications should map unknown type to 未知 and skip source query when no sourceUserId', async () => {
    repoMock.rawQuery
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [{
        id: 'notification-1',
        user_id: 'user-1',
        type: 999,
        content: 'Unknown',
        source_user_id: null,
        is_read: 0,
        created_at: '2026-05-07T00:00:00.000Z',
      }] });

    const result = await getNotifications('user-1');

    expect(result.list[0].typeName).toBe('未知');
    expect(result.list[0].sourceUser).toBeNull();
    expect(repoMock.rawQuery).toHaveBeenCalledTimes(2);
  });

  it('markNotificationAsRead should verify ownership and update read state', async () => {
    repoMock.findById.mockResolvedValueOnce(createNotificationRecord({ id: 'notification-1', userId: 'user-1' }));
    repoMock.update.mockResolvedValueOnce({});

    const result = await markNotificationAsRead('notification-1', 'user-1');

    expect(result).toEqual({ success: true });
    expect(repoMock.update).toHaveBeenCalledWith('notifications', 'notification-1', expect.objectContaining({
      isRead: 1,
      readAt: expect.any(String),
    }));
  });

  it('markNotificationAsRead should reject missing notification and cross-user operation', async () => {
    repoMock.findById.mockResolvedValueOnce(null);
    await expect(markNotificationAsRead('missing', 'user-1')).rejects.toThrow(NotFoundError);

    repoMock.findById.mockResolvedValueOnce(createNotificationRecord({ id: 'notification-1', userId: 'owner-1' }));
    await expect(markNotificationAsRead('notification-1', 'user-1')).rejects.toThrow(ForbiddenError);
  });

  it('markAllNotificationsAsRead should update unread notifications and return rowCount', async () => {
    repoMock.rawQuery.mockResolvedValueOnce({ rowCount: 3, rows: [] });

    await expect(markAllNotificationsAsRead('user-1')).resolves.toEqual({ success: true, count: 3 });
    expect(repoMock.rawQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE notifications SET is_read = 1'),
      ['user-1']
    );
  });

  it('deleteNotification should verify ownership and remove notification', async () => {
    repoMock.findById.mockResolvedValueOnce(createNotificationRecord({ id: 'notification-1', userId: 'user-1' }));
    repoMock.remove.mockResolvedValueOnce(true);

    await expect(deleteNotification('notification-1', 'user-1')).resolves.toEqual({ success: true });
    expect(repoMock.remove).toHaveBeenCalledWith('notifications', 'notification-1');
  });

  it('deleteNotification should reject missing notification and cross-user operation', async () => {
    repoMock.findById.mockResolvedValueOnce(null);
    await expect(deleteNotification('missing', 'user-1')).rejects.toThrow(NotFoundError);

    repoMock.findById.mockResolvedValueOnce(createNotificationRecord({ id: 'notification-1', userId: 'owner-1' }));
    await expect(deleteNotification('notification-1', 'user-1')).rejects.toThrow(ForbiddenError);
  });
});
