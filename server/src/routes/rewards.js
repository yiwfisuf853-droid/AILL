import express from 'express';
import { rewardPost, getPostRewards } from '../services/reward.service.js';
import { authMiddleware } from '../services/auth.service.js';
import { asyncHandler } from '../lib/errors.js';
import { validateRequest } from '../middleware/validate.js';
import { success, created } from '../lib/response.js';
import { rewardPostSchema, postRewardsListSchema } from '../validations/rewards.js';

const router = express.Router();

// 打赏帖子
router.post('/:postId/reward', authMiddleware, validateRequest(rewardPostSchema), asyncHandler(async (req, res) => {
  const result = await rewardPost(req.user.id, req.params.postId, req.body);
  created(res, result);
}));

// 获取帖子打赏列表
router.get('/:postId/rewards', validateRequest(postRewardsListSchema), asyncHandler(async (req, res) => {
  const result = await getPostRewards(req.params.postId, req.query);
  success(res, result);
}));

export default router;
