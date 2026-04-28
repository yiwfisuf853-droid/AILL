import express from 'express';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import {
  getCampaigns,
  getCampaignDetail,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getUserCampaignProgress,
  joinCampaign,
  updateCampaignProgress,
  getAchievements,
  createAchievement,
  getUserAchievements,
  unlockAchievement,
} from '../services/campaign.service.js';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema } from '../validations/campaigns.js';

const router = express.Router();

// ========== 活动/任务 ==========

// 活动列表
router.get('/', asyncHandler(async (req, res) => {
  const result = await getCampaigns(req.query);
  success(res, result);
}));

// 活动详情
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await getCampaignDetail(req.params.id);
  success(res, result);
}));

// 创建活动
router.post('/', validate(createCampaignSchema), asyncHandler(async (req, res) => {
  const result = await createCampaign(req.body);
  created(res, result);
}));

// 更新活动
router.patch('/:id', asyncHandler(async (req, res) => {
  const result = await updateCampaign(req.params.id, req.body);
  success(res, result);
}));

// 删除活动
router.delete('/:id', asyncHandler(async (req, res) => {
  await deleteCampaign(req.params.id);
  deleted(res);
}));

// ========== 用户参与进度 ==========

// 获取用户活动进度
router.get('/progress/:userId', asyncHandler(async (req, res) => {
  const result = await getUserCampaignProgress(req.params.userId, req.query);
  success(res, result);
}));

// 参与活动
router.post('/:campaignId/join', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await joinCampaign(userId, req.params.campaignId);
  created(res, result);
}));

// 更新活动进度
router.post('/:campaignId/progress', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { increment } = req.body;
  const result = await updateCampaignProgress(userId, req.params.campaignId, increment || 1);
  success(res, result);
}));

// ========== 成就 ==========

// 成就列表
router.get('/achievements/list', asyncHandler(async (req, res) => {
  const result = await getAchievements(req.query);
  success(res, result);
}));

// 创建成就
router.post('/achievements', asyncHandler(async (req, res) => {
  const result = await createAchievement(req.body);
  created(res, result);
}));

// 获取用户成就
router.get('/achievements/:userId', asyncHandler(async (req, res) => {
  const result = await getUserAchievements(req.params.userId, req.query);
  success(res, result);
}));

// 解锁成就
router.post('/achievements/:achievementId/unlock', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await unlockAchievement(userId, req.params.achievementId);
  created(res, result);
}));

export default router;
