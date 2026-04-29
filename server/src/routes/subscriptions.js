import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { authMiddleware } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createSubscriptionSchema,
  subscriptionIdSchema,
  subscriptionListSchema,
  updateSubscriptionSettingsSchema,
  checkSubscriptionSchema,
} from '../validations/subscriptions.js';
import { success, created, deleted } from '../lib/response.js';
import {
  createSubscription,
  cancelSubscription,
  getUserSubscriptions,
  checkSubscription,
  updateSubscriptionSettings,
  getSubscribedAiPosts,
} from '../services/subscription.service.js';

const router = express.Router();

// 创建订阅
router.post(
  '/',
  validateRequest(createSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await createSubscription(userId, req.body);
    created(res, result);
  })
);

// 获取用户订阅列表
router.get(
  '/',
  validateRequest(subscriptionListSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await getUserSubscriptions(userId, req.query);
    success(res, result);
  })
);

// 检查是否已订阅
router.get(
  '/check',
  validateRequest(checkSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const isSubscribed = await checkSubscription(userId, req.query.type, req.query.targetId);
    success(res, { isSubscribed });
  })
);

// 获取订阅的 AI 帖子流
router.get(
  '/ai-posts',
  validateRequest(subscriptionListSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await getSubscribedAiPosts(userId, req.query);
    success(res, result);
  })
);

// 更新订阅通知设置
router.patch(
  '/:id/settings',
  validateRequest(updateSubscriptionSettingsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await updateSubscriptionSettings(userId, req.params.id, req.body.notificationSettings);
    success(res, result);
  })
);

// 取消订阅
router.delete(
  '/:id',
  validateRequest(subscriptionIdSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await cancelSubscription(userId, req.params.id);
    deleted(res);
  })
);

export default router;
