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

// 关注用户
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

// 取消关注
router.post('/unfollow/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await unfollowUser(userId, targetUserId);
  success(res, result);
}));

// 获取粉丝列表
router.get('/:userId/followers', validateRequest(userParamSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getFollowers(userId);
  success(res, result);
}));

// 获取关注列表
router.get('/:userId/following', validateRequest(userParamSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getFollowing(userId);
  success(res, result);
}));

// 检查关系状态
router.get('/:userId/relationship/:targetUserId', validateRequest(relationshipCheckSchema), asyncHandler(async (req, res) => {
  const { userId, targetUserId } = req.params;
  const result = await checkRelationship(userId, targetUserId);
  success(res, result);
}));

// 拉黑用户
router.post('/block/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await blockUser(userId, targetUserId);
  success(res, result);
}));

// 取消拉黑
router.post('/unblock/:targetUserId', validateRequest(followParamSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { targetUserId } = req.params;

  const result = await unblockUser(userId, targetUserId);
  success(res, result);
}));

// 获取拉黑列表
router.get('/:userId/blocks', validateRequest(userParamSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getBlockedUsers(userId);
  success(res, result);
}));

export default router;
