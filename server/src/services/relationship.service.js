import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors.js';
import { createNotification } from './notification.service.js';

/**
 * 关注用户
 */
export async function followUser(userId, targetUserId) {
  // 检查是否存在
  const user = await repo.findById('users', userId);
  const targetUser = await repo.findById('users', targetUserId);

  if (!user || !targetUser) {
    throw new NotFoundError('用户不存在');
  }

  if (userId === targetUserId) {
    throw new ValidationError('不能关注自己');
  }

  // 检查是否已经关注
  const existing = await repo.findOne('user_relationships', {
    userId,
    targetUserId,
    type: 1,
  });

  if (existing && !existing.deletedAt) {
    throw new ConflictError('已经关注该用户');
  }

  // 创建关注关系
  const relationship = {
    id: generateId(),
    userId,
    targetUserId,
    type: 1, // 1 关注
    status: 1, // 1 有效
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('user_relationships', relationship);

  // 更新关注数 — 使用原子递增避免竞态
  await repo.increment('users', userId, 'followingCount', 1);
  await repo.increment('users', targetUserId, 'followerCount', 1);

  // 创建通知（使用统一通知服务，支持 WebSocket 推送）
  try {
    await createNotification({
      userId: targetUserId,
      type: 3,
      title: '关注通知',
      content: `${user.username} 关注了你`,
      sourceUserId: userId,
      targetType: 3,
      targetId: userId,
    });
  } catch (e) { console.error('[通知] 关注通知失败:', e.message); }

  return {
    success: true,
    relationship,
    followerCount: (targetUser.followerCount || 0) + 1,
    followingCount: (user.followingCount || 0) + 1,
  };
}

/**
 * 取消关注
 */
export async function unfollowUser(userId, targetUserId) {
  const user = await repo.findById('users', userId);
  const targetUser = await repo.findById('users', targetUserId);

  if (!user || !targetUser) {
    throw new NotFoundError('用户不存在');
  }

  const existing = await repo.findOne('user_relationships', {
    userId,
    targetUserId,
    type: 1,
  });

  if (!existing || existing.deletedAt) {
    throw new ValidationError('未关注该用户');
  }

  await repo.update('user_relationships', existing.id, {
    deletedAt: new Date().toISOString(),
    status: 0,
  });

  // 使用原子递减避免竞态
  await repo.increment('users', userId, 'followingCount', -1);
  await repo.increment('users', targetUserId, 'followerCount', -1);

  return {
    success: true,
    followerCount: Math.max(0, (targetUser.followerCount || 0) - 1),
    followingCount: Math.max(0, (user.followingCount || 0) - 1),
  };
}

/**
 * 获取粉丝列表
 */
export async function getFollowers(userId) {
  const res = await repo.rawQuery(
    `SELECT r.created_at as followed_at, u.id, u.username, u.avatar, u.is_ai
     FROM user_relationships r
     JOIN users u ON u.id = r.user_id
     WHERE r.target_user_id = $1 AND r.type = 1 AND r.status = 1 AND r.deleted_at IS NULL
     ORDER BY r.created_at DESC`,
    [userId]
  );

  const followers = res.rows.map(r => {
    const row = repo.toCamelCase(r);
    return {
      id: row.id,
      username: row.username,
      nickname: row.username,
      avatar: row.avatar,
      isAi: row.isAi,
      followedAt: row.followedAt,
    };
  });

  return { total: followers.length, list: followers };
}

/**
 * 获取关注列表
 */
export async function getFollowing(userId) {
  const res = await repo.rawQuery(
    `SELECT r.created_at as followed_at, u.id, u.username, u.avatar, u.is_ai
     FROM user_relationships r
     JOIN users u ON u.id = r.target_user_id
     WHERE r.user_id = $1 AND r.type = 1 AND r.status = 1 AND r.deleted_at IS NULL
     ORDER BY r.created_at DESC`,
    [userId]
  );

  const following = res.rows.map(r => {
    const row = repo.toCamelCase(r);
    return {
      id: row.id,
      username: row.username,
      nickname: row.username,
      avatar: row.avatar,
      isAi: row.isAi,
      followedAt: row.followedAt,
    };
  });

  return { total: following.length, list: following };
}

/**
 * 检查关系状态
 */
export async function checkRelationship(userId, targetUserId) {
  const followingRes = await repo.rawQuery(
    `SELECT id FROM user_relationships WHERE user_id = $1 AND target_user_id = $2 AND type = 1 AND status = 1 AND deleted_at IS NULL`,
    [userId, targetUserId]
  );
  const isFollowing = followingRes.rows.length > 0;

  const followerRes = await repo.rawQuery(
    `SELECT id FROM user_relationships WHERE user_id = $1 AND target_user_id = $2 AND type = 1 AND status = 1 AND deleted_at IS NULL`,
    [targetUserId, userId]
  );
  const isFollower = followerRes.rows.length > 0;

  const blockRes = await repo.rawQuery(
    `SELECT id FROM user_blocks WHERE user_id = $1 AND target_user_id = $2`,
    [userId, targetUserId]
  );
  const isBlocked = blockRes.rows.length > 0;

  return {
    isFollowing,
    isFollower,
    isBlocked,
    isMutual: isFollowing && isFollower,
  };
}

/**
 * 拉黑用户
 */
export async function blockUser(userId, targetUserId) {
  const user = await repo.findById('users', userId);
  const targetUser = await repo.findById('users', targetUserId);

  if (!user || !targetUser) {
    throw new NotFoundError('用户不存在');
  }

  if (userId === targetUserId) {
    throw new ValidationError('不能拉黑自己');
  }

  const existing = await repo.findOne('user_blocks', {
    userId,
    targetUserId,
  });

  if (existing) {
    throw new ConflictError('已经拉黑该用户');
  }

  const block = {
    id: generateId(),
    userId,
    targetUserId,
    createdAt: new Date().toISOString(),
  };

  await repo.insert('user_blocks', block);

  // 取消关注关系
  const followRel = await repo.findOne('user_relationships', {
    userId,
    targetUserId,
    type: 1,
  });

  if (followRel && !followRel.deletedAt) {
    await repo.update('user_relationships', followRel.id, {
      deletedAt: new Date().toISOString(),
      status: 0,
    });
    // 拉黑时同步递减关注/粉丝计数
    await repo.increment('users', userId, 'followingCount', -1);
    await repo.increment('users', targetUserId, 'followerCount', -1);
  }

  return { success: true, block };
}

/**
 * 取消拉黑
 */
export async function unblockUser(userId, targetUserId) {
  const existing = await repo.findOne('user_blocks', {
    userId,
    targetUserId,
  });

  if (!existing) {
    throw new ValidationError('未拉黑该用户');
  }

  await repo.hardDelete('user_blocks', { id: existing.id });

  return { success: true };
}

/**
 * 获取拉黑列表
 */
export async function getBlockedUsers(userId) {
  const res = await repo.rawQuery(
    `SELECT b.created_at as blocked_at, u.id, u.username, u.avatar, u.is_ai
     FROM user_blocks b
     JOIN users u ON u.id = b.target_user_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

  const blockedUsers = res.rows.map(r => {
    const row = repo.toCamelCase(r);
    return {
      id: row.id,
      username: row.username,
      nickname: row.username,
      avatar: row.avatar,
      isAi: row.isAi,
      blockedAt: row.blockedAt,
    };
  });

  return { total: blockedUsers.length, list: blockedUsers };
}
