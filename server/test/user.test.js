import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../src/lib/errors.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-user-service';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  insert: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  hardDelete: vi.fn(),
  increment: vi.fn(),
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
vi.mock('../src/services/notification.service.js', () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));

const authService = await import('../src/services/auth.service.js');
const relationshipService = await import('../src/services/relationship.service.js');
const trustLevelService = await import('../src/services/trust-level.service.js');

const { getCurrentUser, updateUserProfile, changeUserPassword } = authService;
const {
  blockUser,
  checkRelationship,
  followUser,
  getBlockedUsers,
  getFollowers,
  getFollowing,
  unblockUser,
  unfollowUser,
} = relationshipService;
const { calculateTrustLevel, getTrustLevels, recalculateAllTrustLevels } = trustLevelService;

function createUser(overrides = {}) {
  return {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashed',
    avatar: null,
    bio: 'Hello',
    isAi: false,
    role: 'user',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    trustLevel: 0,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('User/Relationship/Trust 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.findOne.mockResolvedValue(null);
    repoMock.findAll.mockResolvedValue([]);
  });

  describe('profile helpers', () => {
    it('getCurrentUser should return sanitized user and hide passwordHash', async () => {
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1' }));

      const user = await getCurrentUser('user-1');

      expect(user.id).toBe('user-1');
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBeUndefined();
    });

    it('getCurrentUser should throw NotFoundError for missing user', async () => {
      repoMock.findById.mockResolvedValueOnce(null);
      await expect(getCurrentUser('missing')).rejects.toThrow(NotFoundError);
    });

    it('updateUserProfile should only persist allowed profile fields', async () => {
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1' }));
      repoMock.update.mockResolvedValueOnce(createUser({
        id: 'user-1',
        username: 'newname',
        bio: 'New bio',
        avatar: 'https://example.com/avatar.png',
        email: 'new@example.com',
      }));

      const user = await updateUserProfile('user-1', {
        username: 'newname',
        bio: 'New bio',
        avatar: 'https://example.com/avatar.png',
        email: 'new@example.com',
        role: 'admin',
        passwordHash: 'hacked',
      });

      expect(user.username).toBe('newname');
      expect(repoMock.update).toHaveBeenCalledWith('users', 'user-1', expect.objectContaining({
        username: 'newname',
        bio: 'New bio',
        avatar: 'https://example.com/avatar.png',
        email: 'new@example.com',
        updatedAt: expect.any(String),
      }));
      expect(repoMock.update.mock.calls[0][2]).not.toHaveProperty('role');
      expect(repoMock.update.mock.calls[0][2]).not.toHaveProperty('passwordHash');
    });

    it('changeUserPassword should verify old password and update passwordHash', async () => {
      const passwordHash = await bcrypt.hash('oldpassword123', 10);
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1', passwordHash }));
      repoMock.update.mockResolvedValueOnce(createUser({ id: 'user-1' }));

      await expect(changeUserPassword('user-1', 'oldpassword123', 'newpassword456'))
        .resolves.toEqual({ success: true });
      expect(repoMock.update).toHaveBeenCalledWith('users', 'user-1', expect.objectContaining({
        passwordHash: expect.any(String),
        updatedAt: expect.any(String),
      }));
    });
  });

  describe('follow/unfollow relationships', () => {
    it('followUser should create active follow relationship, update counters, and notify target', async () => {
      repoMock.findById
        .mockResolvedValueOnce(createUser({ id: 'user-1', username: 'alice', followingCount: 2 }))
        .mockResolvedValueOnce(createUser({ id: 'target-1', username: 'bob', followerCount: 5 }));
      repoMock.findOne.mockResolvedValueOnce(null);
      repoMock.insert.mockResolvedValueOnce({});
      repoMock.increment.mockResolvedValue({});

      const result = await followUser('user-1', 'target-1');

      expect(result.success).toBe(true);
      expect(result.followerCount).toBe(6);
      expect(result.followingCount).toBe(3);
      expect(repoMock.insert).toHaveBeenCalledWith('user_relationships', expect.objectContaining({
        userId: 'user-1',
        targetId: 'target-1',
        type: 1,
        status: 1,
      }));
      expect(repoMock.increment).toHaveBeenCalledWith('users', 'user-1', 'followingCount', 1);
      expect(repoMock.increment).toHaveBeenCalledWith('users', 'target-1', 'followerCount', 1);
    });

    it('followUser should reject self-follow, missing users, and duplicate active follow', async () => {
      repoMock.findById
        .mockResolvedValueOnce(createUser({ id: 'user-1' }))
        .mockResolvedValueOnce(createUser({ id: 'user-1' }));
      await expect(followUser('user-1', 'user-1')).rejects.toThrow(ValidationError);

      repoMock.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createUser({ id: 'target-1' }));
      await expect(followUser('missing', 'target-1')).rejects.toThrow(NotFoundError);

      repoMock.findById
        .mockResolvedValueOnce(createUser({ id: 'user-1' }))
        .mockResolvedValueOnce(createUser({ id: 'target-1' }));
      repoMock.findOne.mockResolvedValueOnce({ id: 'rel-1', deletedAt: null });
      await expect(followUser('user-1', 'target-1')).rejects.toThrow(ConflictError);
    });

    it('unfollowUser should soft delete active follow and decrement counters', async () => {
      repoMock.findById
        .mockResolvedValueOnce(createUser({ id: 'user-1', followingCount: 2 }))
        .mockResolvedValueOnce(createUser({ id: 'target-1', followerCount: 3 }));
      repoMock.findOne.mockResolvedValueOnce({ id: 'rel-1', deletedAt: null });
      repoMock.update.mockResolvedValueOnce({});
      repoMock.increment.mockResolvedValue({});

      const result = await unfollowUser('user-1', 'target-1');

      expect(result).toEqual({ success: true, followerCount: 2, followingCount: 1 });
      expect(repoMock.update).toHaveBeenCalledWith('user_relationships', 'rel-1', expect.objectContaining({
        deletedAt: expect.any(String),
        status: 0,
      }));
      expect(repoMock.increment).toHaveBeenCalledWith('users', 'user-1', 'followingCount', -1);
      expect(repoMock.increment).toHaveBeenCalledWith('users', 'target-1', 'followerCount', -1);
    });
  });

  describe('relationship queries and blocks', () => {
    it('checkRelationship should derive following/follower/block/mutual flags from SQL results', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ id: 'follow-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'follower-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await checkRelationship('user-1', 'target-1');

      expect(result).toEqual({
        isFollowing: true,
        isFollower: true,
        isBlocked: false,
        isMutual: true,
      });
      expect(repoMock.rawQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('user_id = $1'), ['user-1', 'target-1']);
      expect(repoMock.rawQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('user_id = $1'), ['target-1', 'user-1']);
    });

    it('getFollowers/getFollowing/getBlockedUsers should map joined rows to public list shape', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'user-2', username: 'alice', avatar: null, is_ai: false, followed_at: '2026-05-07' }] });
      await expect(getFollowers('target-1')).resolves.toEqual({
        total: 1,
        list: [{ id: 'user-2', username: 'alice', nickname: 'alice', avatar: null, isAi: false, followedAt: '2026-05-07' }],
      });

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'user-3', username: 'bob', avatar: null, is_ai: true, followed_at: '2026-05-07' }] });
      await expect(getFollowing('user-1')).resolves.toEqual({
        total: 1,
        list: [{ id: 'user-3', username: 'bob', nickname: 'bob', avatar: null, isAi: true, followedAt: '2026-05-07' }],
      });

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'user-4', username: 'blocked', avatar: null, is_ai: false, blocked_at: '2026-05-07' }] });
      await expect(getBlockedUsers('user-1')).resolves.toEqual({
        total: 1,
        list: [{ id: 'user-4', username: 'blocked', nickname: 'blocked', avatar: null, isAi: false, blockedAt: '2026-05-07' }],
      });
    });

    it('blockUser should insert block and cancel existing follow relationship', async () => {
      repoMock.findById
        .mockResolvedValueOnce(createUser({ id: 'user-1' }))
        .mockResolvedValueOnce(createUser({ id: 'target-1' }));
      repoMock.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'rel-1', deletedAt: null });
      repoMock.insert.mockResolvedValueOnce({});
      repoMock.update.mockResolvedValueOnce({});
      repoMock.increment.mockResolvedValue({});

      const result = await blockUser('user-1', 'target-1');

      expect(result.success).toBe(true);
      expect(repoMock.insert).toHaveBeenCalledWith('user_blocks', expect.objectContaining({
        userId: 'user-1',
        targetUserId: 'target-1',
      }));
      expect(repoMock.update).toHaveBeenCalledWith('user_relationships', 'rel-1', expect.objectContaining({ status: 0 }));
      expect(repoMock.increment).toHaveBeenCalledWith('users', 'user-1', 'followingCount', -1);
    });

    it('unblockUser should hard delete existing block and reject missing block', async () => {
      repoMock.findOne.mockResolvedValueOnce({ id: 'block-1' });
      repoMock.hardDelete.mockResolvedValueOnce(true);
      await expect(unblockUser('user-1', 'target-1')).resolves.toEqual({ success: true });
      expect(repoMock.hardDelete).toHaveBeenCalledWith('user_blocks', { id: 'block-1' });

      repoMock.findOne.mockResolvedValueOnce(null);
      await expect(unblockUser('user-1', 'target-1')).rejects.toThrow(ValidationError);
    });
  });

  describe('trust level', () => {
    it('calculateTrustLevel should return 0 for missing user', async () => {
      repoMock.findById.mockResolvedValueOnce(null);
      await expect(calculateTrustLevel('missing')).resolves.toBe(0);
    });

    it('calculateTrustLevel should aggregate activity stats and update changed trust level', async () => {
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1', trustLevel: 0, createdAt: '2026-01-01T00:00:00.000Z' }));
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ cnt: '60' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '120' }] })
        .mockResolvedValueOnce({ rows: [{ total: '80' }] });
      repoMock.update.mockResolvedValueOnce({});

      const result = await calculateTrustLevel('user-1');

      expect(result.level).toBe(3);
      expect(result.name).toBe('活跃');
      expect(result.stats.postCount).toBe(60);
      expect(result.stats.commentCount).toBe(120);
      expect(result.stats.likesReceived).toBe(80);
      expect(repoMock.update).toHaveBeenCalledWith('users', 'user-1', { trustLevel: 3 });
    });

    it('getTrustLevels and recalculateAllTrustLevels should expose config and batch update users', async () => {
      expect(getTrustLevels()[0]).toEqual(expect.objectContaining({ level: 0, name: '新手' }));

      repoMock.findAll.mockResolvedValueOnce([
        createUser({ id: 'user-1', trustLevel: 0 }),
        createUser({ id: 'user-2', trustLevel: 1 }),
      ]);
      repoMock.findById
        .mockResolvedValueOnce(createUser({ id: 'user-1', trustLevel: 0 }))
        .mockResolvedValueOnce(createUser({ id: 'user-2', trustLevel: 1 }));
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });
      repoMock.update.mockResolvedValue({});

      const result = await recalculateAllTrustLevels();

      expect(result).toEqual({ total: 2, updated: 1 });
    });
  });
});
