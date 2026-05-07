import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../src/lib/errors.js';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  hardDelete: vi.fn(),
  batchInsert: vi.fn(),
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

import {
  addMustSeeItem,
  calculateRankings,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  getMustSeeList,
  getRankings,
  removeMustSeeItem,
  updateAnnouncement,
} from '../src/services/ranking.service.js';

function createRankingRecord(overrides = {}) {
  return {
    id: 'ranking-1',
    rankType: 'hot',
    targetType: 1,
    targetId: 'post-1',
    score: 100,
    rankNo: 1,
    period: 'weekly',
    calculatedAt: '2026-05-07T00:00:00.000Z',
    ...overrides,
  };
}

function createAnnouncementRecord(overrides = {}) {
  return {
    id: 'announcement-1',
    title: 'Test Announcement',
    content: 'This is a test',
    type: 1,
    priority: 0,
    isSticky: 0,
    createdBy: 'admin-1',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('Ranking Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.rawQuery.mockResolvedValue({ rows: [] });
    repoMock.findAll.mockResolvedValue({ total: 0, list: [] });
    repoMock.findOne.mockResolvedValue(null);
    repoMock.batchInsert.mockResolvedValue([]);
  });

  describe('rankings', () => {
    it('calculateRankings should calculate and batch insert sorted post rankings', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [
        { id: 'post-1', hot_score: 10, like_count: 1, comment_count: 1, view_count: 10 },
        { id: 'post-2', hot_score: 20, like_count: 10, comment_count: 3, view_count: 100 },
      ] });

      const result = await calculateRankings('hot', 'weekly', 1);

      expect(result).toEqual({ success: true, count: 2, rankType: 'hot', period: 'weekly', targetType: 1 });
      expect(repoMock.hardDelete).toHaveBeenCalledWith('rankings', { rankType: 'hot', period: 'weekly', targetType: 1 });
      expect(repoMock.rawQuery).toHaveBeenCalledWith(expect.stringContaining("status::text IN ('2', 'published')"));
      expect(repoMock.batchInsert).toHaveBeenCalledWith('rankings', [
        expect.objectContaining({ targetId: 'post-2', targetType: 1, rankNo: 1, score: 59 }),
        expect.objectContaining({ targetId: 'post-1', targetType: 1, rankNo: 2, score: 16 }),
      ]);
    });

    it('calculateRankings should calculate user rankings', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [
        { id: 'user-1', follower_count: 10, post_count: 10 },
        { id: 'user-2', follower_count: 5, post_count: 1 },
      ] });

      const result = await calculateRankings('influence', 'monthly', 2);

      expect(result.count).toBe(2);
      expect(repoMock.rawQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE deleted_at IS NULL');
      expect(repoMock.batchInsert).toHaveBeenCalledWith('rankings', [
        expect.objectContaining({ targetId: 'user-1', targetType: 2, rankNo: 1, score: 80 }),
        expect.objectContaining({ targetId: 'user-2', targetType: 2, rankNo: 2, score: 28 }),
      ]);
    });

    it('getRankings should load target post/user snapshots for ranking items', async () => {
      repoMock.findAll.mockResolvedValueOnce({
        total: 2,
        list: [
          createRankingRecord({ id: 'r1', targetType: 1, targetId: 'post-1' }),
          createRankingRecord({ id: 'r2', targetType: 2, targetId: 'user-1' }),
        ],
      });
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'Post', like_count: 10 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'alice', follower_count: 5 }] });

      const result = await getRankings({ rankType: 'hot', period: 'weekly', targetType: 1, page: 2, limit: 5 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.rankType).toBe('hot');
      expect(result.period).toBe('weekly');
      expect(result.list[0].target).toEqual({ id: 'post-1', title: 'Post', likeCount: 10 });
      expect(result.list[1].target).toEqual({ id: 'user-1', username: 'alice', followerCount: 5 });
      expect(repoMock.findAll).toHaveBeenCalledWith('rankings', {
        where: { rankType: 'hot', period: 'weekly', targetType: 1 },
        page: 2,
        limit: 5,
        orderBy: 'rank_no ASC',
      });
    });
  });

  describe('must see list', () => {
    it('getMustSeeList should paginate list and attach post snapshots', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ id: 'must-1', target_id: 'post-1', sort_order: 1 }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'Post' }] });

      const result = await getMustSeeList({ page: 2, limit: 5 });

      expect(result).toEqual({
        total: 1,
        page: 2,
        limit: 5,
        list: [{ id: 'must-1', targetId: 'post-1', sortOrder: 1, post: { id: 'post-1', title: 'Post' } }],
      });
      expect(repoMock.rawQuery.mock.calls[0][1]).toEqual([5, 5]);
      expect(repoMock.rawQuery.mock.calls[2][1]).toEqual(['post-1']);
    });

    it('addMustSeeItem should validate post and insert derived item', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'Post Title', cover_image: '/cover.png' }] });
      repoMock.findOne.mockResolvedValueOnce(null);
      repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

      const result = await addMustSeeItem({ targetId: 'post-1', addedBy: 'admin-1', description: '精选' });

      expect(result.success).toBe(true);
      expect(result.item.title).toBe('Post Title');
      expect(result.item.coverImage).toBe('/cover.png');
      expect(repoMock.insert).toHaveBeenCalledWith('must_see_list', expect.objectContaining({
        targetType: 1,
        targetId: 'post-1',
        title: 'Post Title',
        coverImage: '/cover.png',
        description: '精选',
        sortOrder: 0,
        addedBy: 'admin-1',
      }));
    });

    it('addMustSeeItem should reject invalid, missing post, and duplicate cases', async () => {
      await expect(addMustSeeItem({ addedBy: 'admin-1' })).rejects.toThrow(ValidationError);
      await expect(addMustSeeItem({ targetId: 'post-1' })).rejects.toThrow(ValidationError);

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      await expect(addMustSeeItem({ targetId: 'missing', addedBy: 'admin-1' })).rejects.toThrow(NotFoundError);

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'Post' }] });
      repoMock.findOne.mockResolvedValueOnce({ id: 'must-1' });
      await expect(addMustSeeItem({ targetId: 'post-1', addedBy: 'admin-1' })).rejects.toThrow(ConflictError);
    });

    it('removeMustSeeItem should soft delete item through repository remove', async () => {
      repoMock.remove.mockResolvedValueOnce(true);
      await expect(removeMustSeeItem('must-1')).resolves.toEqual({ success: true });
      expect(repoMock.remove).toHaveBeenCalledWith('must_see_list', 'must-1');
    });
  });

  describe('announcements', () => {
    it('createAnnouncement should validate required fields and insert defaults', async () => {
      repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

      const result = await createAnnouncement({
        title: 'Test Announcement',
        content: 'This is a test',
        createdBy: 'admin-1',
      });

      expect(result.success).toBe(true);
      expect(result.item.title).toBe('Test Announcement');
      expect(repoMock.insert).toHaveBeenCalledWith('announcements', expect.objectContaining({
        title: 'Test Announcement',
        content: 'This is a test',
        type: 1,
        priority: 0,
        startTime: null,
        endTime: null,
        isSticky: 0,
        createdBy: 'admin-1',
        deletedAt: null,
      }));
    });

    it('createAnnouncement should reject missing title/content/createdBy', async () => {
      await expect(createAnnouncement({ content: 'c', createdBy: 'admin-1' })).rejects.toThrow(ValidationError);
      await expect(createAnnouncement({ title: 't', createdBy: 'admin-1' })).rejects.toThrow(ValidationError);
      await expect(createAnnouncement({ title: 't', content: 'c' })).rejects.toThrow(ValidationError);
    });

    it('getAnnouncements should filter active windows and sort sticky/priority safely', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'announcement-1', title: 'Sticky', is_sticky: 1, priority: 5 }] });

      const result = await getAnnouncements({ type: 2, page: 2, limit: 5 });

      expect(result.total).toBe(1);
      expect(result.list).toEqual([{ id: 'announcement-1', title: 'Sticky', isSticky: 1, priority: 5 }]);
      expect(repoMock.rawQuery.mock.calls[0][0]).toContain('type = $1');
      expect(repoMock.rawQuery.mock.calls[0][0]).toContain('start_time IS NULL OR start_time <= $2');
      expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY is_sticky DESC, priority DESC, created_at DESC');
      expect(repoMock.rawQuery.mock.calls[1][1][0]).toBe(2);
      expect(repoMock.rawQuery.mock.calls[1][1].slice(-2)).toEqual([5, 5]);
    });

    it('updateAnnouncement should only update allowed fields and reject missing announcement', async () => {
      repoMock.findOne.mockResolvedValueOnce(createAnnouncementRecord({ id: 'announcement-1' }));
      repoMock.update.mockResolvedValueOnce(createAnnouncementRecord({ id: 'announcement-1', title: 'Updated' }));

      const result = await updateAnnouncement('announcement-1', {
        title: 'Updated',
        content: 'Updated content',
        type: 2,
        priority: 10,
        startTime: null,
        endTime: null,
        isSticky: 1,
        createdBy: 'attacker',
      });

      expect(result.success).toBe(true);
      expect(repoMock.update).toHaveBeenCalledWith('announcements', 'announcement-1', expect.objectContaining({
        title: 'Updated',
        content: 'Updated content',
        type: 2,
        priority: 10,
        startTime: null,
        endTime: null,
        isSticky: 1,
        updatedAt: expect.any(String),
      }));
      expect(repoMock.update.mock.calls[0][2]).not.toHaveProperty('createdBy');

      repoMock.findOne.mockResolvedValueOnce(null);
      await expect(updateAnnouncement('missing', { title: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('deleteAnnouncement should delegate soft delete to repository remove', async () => {
      repoMock.remove.mockResolvedValueOnce(true);
      await expect(deleteAnnouncement('announcement-1')).resolves.toEqual({ success: true });
      expect(repoMock.remove).toHaveBeenCalledWith('announcements', 'announcement-1');
    });
  });
});
