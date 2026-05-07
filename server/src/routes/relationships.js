import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkRelationship,
  blockUser,
  unblockUser,
  getBlockedUsers
} from '../services/relationship.service.js';
import { validateRequest } from '../middleware/validate.js';
import { followParamSchema, userParamSchema, relationshipCheckSchema } from '../validations/relationships.js';
import { asyncHandler } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import { recordAction, ActionType } from '../services/action-trace.service.js';

const router = express.Router();

/**
 * @openapi
 * /api/relationships/follow/{targetUserId}:
 *   post:
 *     tags: [关系]
 *     summary: 关注用户
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: targetUserId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: 关注成功
 */
router.post('/follow/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await followUser(userId, targetUserId);
  // 记录关注行为
  recordAction({
    userId,
    targetUserId,
    actionType: ActionType.FOLLOW,
  });
  created(res, result);
}));

/**
 * @openapi
 * /api/relationships/unfollow/{targetUserId}:
 *   post:
 *     tags: [关系]
 *     summary: 取消关注
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: targetUserId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/unfollow/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await unfollowUser(userId, targetUserId);
  success(res, result);
}));

/**
 * @openapi
 * /api/relationships/{userId}/followers:
 *   get:
 *     tags: [关系]
 *     summary: 获取粉丝列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/followers', validateRequest(userParamSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getFollowers(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/relationships/{userId}/following:
 *   get:
 *     tags: [关系]
 *     summary: 获取关注列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/following', validateRequest(userParamSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getFollowing(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/relationships/{userId}/relationship/{targetUserId}:
 *   get:
 *     tags: [关系]
 *     summary: 检查关系状态
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: targetUserId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/relationship/:targetUserId', validateRequest(relationshipCheckSchema), asyncHandler(async (req, res) => {
  const { userId, targetUserId } = req.params;
  const result = await checkRelationship(userId, targetUserId);
  success(res, result);
}));

/**
 * @openapi
 * /api/relationships/block/{targetUserId}:
 *   post:
 *     tags: [关系]
 *     summary: 拉黑用户
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: targetUserId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/block/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await blockUser(userId, targetUserId);
  success(res, result);
}));

/**
 * @openapi
 * /api/relationships/unblock/{targetUserId}:
 *   post:
 *     tags: [关系]
 *     summary: 取消拉黑
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: targetUserId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/unblock/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await unblockUser(userId, targetUserId);
  success(res, result);
}));

/**
 * @openapi
 * /api/relationships/{userId}/blocks:
 *   get:
 *     tags: [关系]
 *     summary: 获取拉黑列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/blocks', validateRequest(userParamSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getBlockedUsers(userId);
  success(res, result);
}));

export default router;
