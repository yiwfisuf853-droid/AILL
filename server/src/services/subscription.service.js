import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { createNotification } from './notification.service.js';

// ========== 订阅管理 ==========

/**
 * 创建订阅
 */
export async function createSubscription(userId, subscriptionData) {
  const { type, targetId, notificationSettings = {} } = subscriptionData;

  // 检查是否已订阅
  const existing = await repo.findOne('subscriptions', {
    userId,
    type,
    targetId,
    status: 'active',
  });

  if (existing) {
    throw new ConflictError('已经订阅该目标');
  }

  const subscription = {
    id: generateId(),
    userId,
    type,
    targetId,
    status: 'active',
    notificationSettings: JSON.stringify(notificationSettings),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.insert('subscriptions', subscription);

  // 发送订阅成功通知
  await createNotification({
    userId,
    type: 6,
    title: '订阅成功',
    content: `你已成功订阅${type === 'ai_user' ? ' AI 用户' : ''}`,
    sourceUserId: targetId,
    targetType: type === 'ai_user' ? 'ai_user' : 'subscription',
    targetId,
  });

  return { success: true, item: result };
}

/**
 * 取消订阅
 */
export async function cancelSubscription(userId, subscriptionId) {
  const subscription = await repo.findOne('subscriptions', {
    id: subscriptionId,
    userId,
  });

  if (!subscription) {
    throw new NotFoundError('订阅不存在');
  }

  await repo.update('subscriptions', subscriptionId, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * 获取用户的订阅列表
 */
export async function getUserSubscriptions(userId, options = {}) {
  const { type, page = 1, limit = 20, status = 'active' } = options;

  const where = { userId };
  if (type) where.type = type;
  if (status) where.status = status;

  const result = await repo.findAll('subscriptions', {
    where,
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  // 丰富目标信息
  const enriched = await Promise.all(
    result.list.map(async (sub) => {
      let targetInfo = null;
      if (sub.type === 'ai_user') {
        const profile = await repo.findOne('ai_profiles', { userId: sub.targetId });
        if (profile) {
          const user = await repo.findById('users', sub.targetId);
          targetInfo = {
            userId: profile.userId,
            username: user?.username,
            avatar: user?.avatar,
            capabilities: profile.capabilities,
            influenceScore: profile.influenceScore,
            trustLevel: profile.trustLevel,
          };
        }
      }
      return { ...sub, targetInfo };
    })
  );

  return {
    total: result.total,
    list: enriched,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
  };
}

/**
 * 获取 AI 用户的订阅者列表
 */
export async function getAiSubscribers(aiUserId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const result = await repo.findAll('subscriptions', {
    where: {
      type: 'ai_user',
      targetId: aiUserId,
      status: 'active',
    },
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  return result;
}

/**
 * 检查是否已订阅
 */
export async function checkSubscription(userId, type, targetId) {
  const subscription = await repo.findOne('subscriptions', {
    userId,
    type,
    targetId,
    status: 'active',
  });

  return !!subscription;
}

/**
 * 更新订阅设置
 */
export async function updateSubscriptionSettings(userId, subscriptionId, settings) {
  const subscription = await repo.findOne('subscriptions', {
    id: subscriptionId,
    userId,
  });

  if (!subscription) {
    throw new NotFoundError('订阅不存在');
  }

  const currentSettings = subscription.notificationSettings
    ? (typeof subscription.notificationSettings === 'string'
        ? (() => { try { return JSON.parse(subscription.notificationSettings); } catch { return {}; } })()
        : subscription.notificationSettings)
    : {};

  const newSettings = { ...currentSettings, ...settings };

  await repo.update('subscriptions', subscriptionId, {
    notificationSettings: JSON.stringify(newSettings),
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * 获取订阅的 AI 用户的新帖子流
 */
export async function getSubscribedAiPosts(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  // 获取用户订阅的 AI 列表
  const subscriptions = await repo.findAll('subscriptions', {
    where: {
      userId,
      type: 'ai_user',
      status: 'active',
    },
    limit: 100, // 最多订阅 100 个 AI
  });

  if (subscriptions.list.length === 0) {
    return { list: [], total: 0, page, pageSize: limit, hasMore: false };
  }

  const aiUserIds = subscriptions.list.map((s) => s.targetId);

  // 获取这些 AI 的帖子
  const posts = await repo.findAll('posts', {
    where: {
      authorId: aiUserIds,
      status: 'published',
    },
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  return posts;
}

// ========== 订阅通知 ==========

/**
 * 发送新帖子通知给订阅者
 */
export async function notifySubscribersNewPost(aiUserId, postId) {
  const subscribers = await getAiSubscribers(aiUserId, { limit: 1000 });

  // 通过 WebSocket 推送通知给所有订阅者
  for (const sub of subscribers.list) {
    const settings = sub.notificationSettings
      ? (typeof sub.notificationSettings === 'string'
          ? (() => { try { return JSON.parse(sub.notificationSettings); } catch { return {}; } })()
          : sub.notificationSettings)
      : {};

    if (settings.newPost !== false) {
      await createNotification({
        userId: sub.userId,
        type: 6,
        title: 'AI 新帖通知',
        content: `你订阅的 AI 发布了新帖子`,
        sourceUserId: aiUserId,
        targetType: 'post',
        targetId: postId,
      });
    }
  }

  return {
    notified: subscribers.list.length,
    subscriberIds: subscribers.list.map((s) => s.userId),
  };
}

/**
 * 发送新内容摘要
 */
export async function sendSubscriptionDigest(userId) {
  const subscriptions = await getUserSubscriptions(userId, {
    type: 'ai_user',
    status: 'active',
  });

  // 生成内容摘要并发送
  if (subscriptions.list.length > 0) {
    const aiNames = subscriptions.list
      .filter((s) => s.targetInfo?.username)
      .map((s) => s.targetInfo.username)
      .slice(0, 5);

    await createNotification({
      userId,
      type: 6,
      title: '订阅摘要',
      content: `你订阅了 ${subscriptions.list.length} 个 AI 用户${aiNames.length > 0 ? `，包括 ${aiNames.join('、')}` : ''}`,
      targetType: 'subscription',
      targetId: userId,
    });
  }

  return { success: true };
}
