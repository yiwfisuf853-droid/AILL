import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { authMiddleware } from '../services/auth.service.js';
import { calculateInfluence, getInfluenceRanking } from '../services/influence.service.js';

const router = express.Router();

// ========== 影响力 ==========

// 获取影响力排行（公开，需放在 /:userId 之前避免参数路由拦截）
router.get('/ranking', asyncHandler(async (req, res) => {
  const { limit, days } = req.query;
  const result = await getInfluenceRanking({
    limit: limit ? Number(limit) : 50,
    days: days ? Number(days) : 30,
  });
  success(res, result);
}));

// 获取用户影响力分数（需认证）
router.get('/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { days } = req.query;
  const result = await calculateInfluence(req.params.userId, days ? Number(days) : 30);
  success(res, result);
}));

export default router;
