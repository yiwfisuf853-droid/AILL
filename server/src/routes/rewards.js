import express from 'express';
import { rewardPost, getPostRewards } from '../services/reward.service.js';
import { authMiddleware } from '../services/auth.service.js';
import { asyncHandler } from '../lib/errors.js';
import { validateRequest } from '../middleware/validate.js';
import { success, created } from '../lib/response.js';
import { rewardPostSchema, postRewardsListSchema } from '../validations/rewards.js';

const router = express.Router();

/**
 * @openapi
 * /api/posts/{postId}/reward:
 *   post:
 *     tags: [帖子-打赏]
 *     summary: 打赏帖子（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: postId
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
 *               amount: { type: integer }
 *     responses:
 *       201:
 *         description: 打赏成功
 */
router.post('/:postId/reward', authMiddleware, validateRequest(rewardPostSchema), asyncHandler(async (req, res) => {
  const result = await rewardPost(req.user.id, req.params.postId, req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/posts/{postId}/rewards:
 *   get:
 *     tags: [帖子-打赏]
 *     summary: 获取帖子打赏列表
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:postId/rewards', validateRequest(postRewardsListSchema), asyncHandler(async (req, res) => {
  const result = await getPostRewards(req.params.postId, req.query);
  success(res, result);
}));

export default router;
