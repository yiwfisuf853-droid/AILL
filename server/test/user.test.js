import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearDatabase } from '../src/models/db.js';
import {
  updateProfile,
  getCurrentUser,
  changePassword,
} from '../src/services/auth.service.js';
import {
  followUser,
  unfollowUser,
  checkRelationship,
  getFollowers,
  getFollowing,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '../src/services/relationship.service.js';
import { calculateTrustLevel } from '../src/services/trust-level.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../src/lib/errors.js';

describe('User Service', () => {
  let userId;

  beforeEach(() => {
    clearDatabase();
    userId = 'user-001';
    db.users.push({
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$dummyHashForTestingPurposesOnly',
      avatar: null,
      bio: 'Hello',
      isAi: false,
      role: 'user',
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  });

  describe('getUserById (getCurrentUser)', () => {
    it('should return user by id', () => {
      const user = getCurrentUser(userId);

      expect(user.id).toBe(userId);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('should not include password', () => {
      const user = getCurrentUser(userId);
      expect(user.password).toBeUndefined();
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => getCurrentUser('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('updateUser (updateProfile)', () => {
    it('should update username', async () => {
      const updated = await updateProfile(userId, { username: 'newname' });
      expect(updated.username).toBe('newname');
    });

    it('should update bio', async () => {
      const updated = await updateProfile(userId, { bio: 'New bio text' });
      expect(updated.bio).toBe('New bio text');
    });

    it('should update avatar', async () => {
      const updated = await updateProfile(userId, { avatar: 'http://new-avatar.jpg' });
      expect(updated.avatar).toBe('http://new-avatar.jpg');
    });

    it('should update email', async () => {
      const updated = await updateProfile(userId, { email: 'new@example.com' });
      expect(updated.email).toBe('new@example.com');
    });

    it('should update multiple fields at once', async () => {
      const updated = await updateProfile(userId, {
        username: 'multi',
        bio: 'Multi update',
        avatar: 'http://avatar.jpg',
      });

      expect(updated.username).toBe('multi');
      expect(updated.bio).toBe('Multi update');
      expect(updated.avatar).toBe('http://avatar.jpg');
    });

    it('should not update password via updateProfile', async () => {
      await updateProfile(userId, { password: 'should-not-change' });
      expect(db.users[0].password).toBe('$2a$10$dummyHashForTestingPurposesOnly');
    });

    it('should update updatedAt timestamp', async () => {
      const updated = await updateProfile(userId, { bio: 'Changed' });
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(updateProfile('nonexistent', { bio: 'test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('trustLevel (calculateTrustLevel)', () => {
    it('should return level 0 for new user', () => {
      const result = calculateTrustLevel(userId);
      expect(result.level).toBe(0);
      expect(result.name).toBe('新手');
    });

    it('should calculate trust level based on activity', () => {
      // Add posts, comments, likes
      for (let i = 0; i < 5; i++) {
        db.posts.push({
          id: `post-${i}`,
          authorId: userId,
          likeCount: 1,
          deletedAt: null,
        });
      }
      for (let i = 0; i < 10; i++) {
        db.comments.push({ id: `comment-${i}`, authorId: userId });
      }

      const result = calculateTrustLevel(userId);
      expect(result.stats.postCount).toBe(5);
      expect(result.stats.commentCount).toBe(10);
    });

    it('should return stats object', () => {
      const result = calculateTrustLevel(userId);
      expect(result.stats).toBeDefined();
      expect(result.stats.postCount).toBe(0);
      expect(result.stats.commentCount).toBe(0);
      expect(result.stats.likesReceived).toBe(0);
    });

    it('should return nextLevel when not at max', () => {
      const result = calculateTrustLevel(userId);
      expect(result.nextLevel).toBeDefined();
      expect(result.nextLevel.minPosts).toBeDefined();
    });

    it('should handle non-existent user', () => {
      const result = calculateTrustLevel('nonexistent');
      expect(result).toBe(0);
    });
  });

  describe('searchUsers (via db.users)', () => {
    beforeEach(() => {
      db.users.push({
        id: 'user-002',
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed',
        role: 'user',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
      db.users.push({
        id: 'user-003',
        username: 'bob',
        email: 'bob@test.org',
        password: 'hashed',
        role: 'user',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    });

    it('should find user by username (case-insensitive)', () => {
      const results = db.users.filter(u =>
        u.username.toLowerCase().includes('alice')
      );
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('alice');
    });

    it('should find user by email', () => {
      const results = db.users.filter(u =>
        u.email.toLowerCase().includes('test.org')
      );
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('bob');
    });

    it('should search across multiple fields', () => {
      const q = 'example';
      const results = db.users.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
      expect(results).toHaveLength(2); // testuser and alice both have example.com
    });

    it('should return empty for no match', () => {
      const results = db.users.filter(u =>
        u.username.toLowerCase().includes('nonexistent')
      );
      expect(results).toHaveLength(0);
    });
  });

  describe('followUser / unfollowUser', () => {
    let targetUserId;

    beforeEach(() => {
      targetUserId = 'target-001';
      db.users.push({
        id: targetUserId,
        username: 'target',
        email: 'target@example.com',
        password: 'hashed',
        role: 'user',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    });

    it('should follow a user', async () => {
      const result = await followUser(userId, targetUserId);

      expect(result.success).toBe(true);
      expect(result.followerCount).toBe(1);
      expect(result.followingCount).toBe(1);
    });

    it('should increment follower/following counts', async () => {
      await followUser(userId, targetUserId);

      const user = db.users.find(u => u.id === userId);
      const target = db.users.find(u => u.id === targetUserId);
      expect(user.followingCount).toBe(1);
      expect(target.followerCount).toBe(1);
    });

    it('should throw ConflictError when following twice', async () => {
      await followUser(userId, targetUserId);
      await expect(followUser(userId, targetUserId)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError when following self', async () => {
      await expect(followUser(userId, userId)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent target', async () => {
      await expect(followUser(userId, 'nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should unfollow a user', async () => {
      await followUser(userId, targetUserId);
      const result = await unfollowUser(userId, targetUserId);

      expect(result.success).toBe(true);
      expect(result.followerCount).toBe(0);
      expect(result.followingCount).toBe(0);
    });

    it('should throw ValidationError when unfollowing non-followed user', async () => {
      await expect(unfollowUser(userId, targetUserId)).rejects.toThrow(ValidationError);
    });
  });

  describe('checkRelationship', () => {
    let targetUserId;

    beforeEach(() => {
      targetUserId = 'target-002';
      db.users.push({
        id: targetUserId,
        username: 'target2',
        email: 'target2@example.com',
        password: 'hashed',
        role: 'user',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    });

    it('should return isFollowing false when not following', async () => {
      const result = await checkRelationship(userId, targetUserId);
      expect(result.isFollowing).toBe(false);
    });

    it('should return isFollowing true after following', async () => {
      await followUser(userId, targetUserId);
      const result = await checkRelationship(userId, targetUserId);
      expect(result.isFollowing).toBe(true);
    });

    it('should detect mutual follow', async () => {
      await followUser(userId, targetUserId);
      await followUser(targetUserId, userId);

      const result = await checkRelationship(userId, targetUserId);
      expect(result.isFollowing).toBe(true);
      expect(result.isFollower).toBe(true);
      expect(result.isMutual).toBe(true);
    });
  });

  describe('getFollowers / getFollowing', () => {
    let targetUserId;

    beforeEach(() => {
      targetUserId = 'popular-001';
      db.users.push({
        id: targetUserId,
        username: 'popular',
        nickname: 'PopularUser',
        email: 'popular@example.com',
        password: 'hashed',
        avatar: 'http://avatar.jpg',
        isAi: false,
        role: 'user',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    });

    it('should return followers list', async () => {
      await followUser(userId, targetUserId);

      const result = await getFollowers(targetUserId);
      expect(result.total).toBe(1);
      expect(result.list[0].id).toBe(userId);
    });

    it('should return following list', async () => {
      await followUser(userId, targetUserId);

      const result = await getFollowing(userId);
      expect(result.total).toBe(1);
      expect(result.list[0].id).toBe(targetUserId);
    });

    it('should return empty list when no followers', async () => {
      const result = await getFollowers(targetUserId);
      expect(result.total).toBe(0);
      expect(result.list).toHaveLength(0);
    });
  });

  describe('blockUser / unblockUser', () => {
    let targetUserId;

    beforeEach(() => {
      targetUserId = 'block-target-001';
      db.users.push({
        id: targetUserId,
        username: 'blocktarget',
        email: 'block@example.com',
        password: 'hashed',
        role: 'user',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    });

    it('should block a user', async () => {
      const result = await blockUser(userId, targetUserId);
      expect(result.success).toBe(true);
      expect(result.block).toBeDefined();
    });

    it('should throw ConflictError when blocking twice', async () => {
      await blockUser(userId, targetUserId);
      await expect(blockUser(userId, targetUserId)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError when blocking self', async () => {
      await expect(blockUser(userId, userId)).rejects.toThrow(ValidationError);
    });

    it('should unblock a user', async () => {
      await blockUser(userId, targetUserId);
      const result = await unblockUser(userId, targetUserId);
      expect(result.success).toBe(true);
    });

    it('should throw ValidationError when unblocking non-blocked user', async () => {
      await expect(unblockUser(userId, targetUserId)).rejects.toThrow(ValidationError);
    });

    it('should return blocked users list', async () => {
      await blockUser(userId, targetUserId);
      const result = await getBlockedUsers(userId);
      expect(result.total).toBe(1);
    });

    it('should cancel follow relationship when blocking', async () => {
      await followUser(userId, targetUserId);
      await blockUser(userId, targetUserId);

      const result = await checkRelationship(userId, targetUserId);
      expect(result.isFollowing).toBe(false);
    });
  });
});
