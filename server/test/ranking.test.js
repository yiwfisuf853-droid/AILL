import { describe, it, expect, beforeEach } from 'vitest';
import { db, generateId, clearDatabase } from '../src/models/db.js';
import { getRankings, calculateRankings, createAnnouncement, getAnnouncements } from '../src/services/ranking.service.js';

describe('Ranking Service', () => {
  beforeEach(() => {
    clearDatabase();
  });

  describe('Rankings', () => {
    it('should calculate post rankings', async () => {
      // Add test posts
      db.posts = [
        { id: 'p1', likeCount: 10, commentCount: 5, viewCount: 100, hotScore: 50, status: 'published', deletedAt: null },
        { id: 'p2', likeCount: 20, commentCount: 10, viewCount: 200, hotScore: 30, status: 'published', deletedAt: null },
      ];

      const result = await calculateRankings('hot', 'weekly', 1);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      const rankings = await getRankings({ rankType: 'hot', period: 'weekly' });
      expect(rankings.list).toHaveLength(2);
      // p2 should be ranked higher (more engagement)
      expect(rankings.list[0].targetId).toBe('p2');
    });

    it('should calculate user rankings', async () => {
      db.users = [
        { id: 'u1', followerCount: 100, postCount: 50, deletedAt: null },
        { id: 'u2', followerCount: 50, postCount: 20, deletedAt: null },
      ];

      const result = await calculateRankings('hot', 'weekly', 2);
      expect(result.success).toBe(true);

      const rankings = await getRankings({ rankType: 'hot', period: 'weekly', targetType: 2 });
      expect(rankings.list[0].rankNo).toBe(1);
    });
  });

  describe('Announcements', () => {
    it('should create an announcement', async () => {
      const result = await createAnnouncement({
        title: 'Test Announcement',
        content: 'This is a test',
        type: 1,
        createdBy: 'admin',
      });

      expect(result.success).toBe(true);
      expect(result.item.title).toBe('Test Announcement');
    });

    it('should not create without title', async () => {
      await expect(createAnnouncement({ content: 'test', createdBy: 'admin' }))
        .rejects.toThrow('缺少公告标题');
    });

    it('should get announcements sorted by sticky and priority', async () => {
      await createAnnouncement({ title: 'Normal', content: 'c', type: 1, priority: 5, isSticky: 0, createdBy: 'admin' });
      await createAnnouncement({ title: 'Sticky', content: 'c', type: 1, priority: 3, isSticky: 1, createdBy: 'admin' });

      const result = await getAnnouncements();
      expect(result.list[0].title).toBe('Sticky');
    });
  });
});
