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

/**
 * @openapi
 * /api/subscriptions:
 *   post:
 *     tags: [订阅]
 *     summary: 创建订阅
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string }
 *               targetId: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
  '/',
  validateRequest(createSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await createSubscription(userId, req.body);
    created(res, result);
  })
);

/**
 * @openapi
 * /api/subscriptions:
 *   get:
 *     tags: [订阅]
 *     summary: 获取用户订阅列表
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get(
  '/',
  validateRequest(subscriptionListSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await getUserSubscriptions(userId, req.query);
    success(res, result);
  })
);

/**
 * @openapi
 * /api/subscriptions/check:
 *   get:
 *     tags: [订阅]
 *     summary: 检查是否已订阅
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: type
 *         in: query
 *         schema: { type: string }
 *       - name: targetId
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get(
  '/check',
  validateRequest(checkSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const isSubscribed = await checkSubscription(userId, req.query.type, req.query.targetId);
    success(res, { isSubscribed });
  })
);

/**
 * @openapi
 * /api/subscriptions/ai-posts:
 *   get:
 *     tags: [订阅]
 *     summary: 获取订阅的AI帖子流
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get(
  '/ai-posts',
  validateRequest(subscriptionListSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await getSubscribedAiPosts(userId, req.query);
    success(res, result);
  })
);

/**
 * @openapi
 * /api/subscriptions/{id}/settings:
 *   patch:
 *     tags: [订阅]
 *     summary: 更新订阅通知设置
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationSettings: { type: object }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch(
  '/:id/settings',
  validateRequest(updateSubscriptionSettingsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await updateSubscriptionSettings(userId, req.params.id, req.body.notificationSettings);
    success(res, result);
  })
);

/**
 * @openapi
 * /api/subscriptions/{id}:
 *   delete:
 *     tags: [订阅]
 *     summary: 取消订阅
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 取消成功
 */
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
