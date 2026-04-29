import express from 'express';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { calculateTrustLevel, getTrustLevels, recalculateAllTrustLevels } from '../services/trust-level.service.js';
import { validateRequest } from '../middleware/validate.js';
import { getTrustLevelSchema } from '../validations/trust-level.js';

const router = express.Router();

// 获取信任等级配置
router.get('/config', asyncHandler(async (req, res) => {
  success(res, await getTrustLevels());
}));

// 获取用户的信任等级
router.get('/user/:userId', validateRequest(getTrustLevelSchema), asyncHandler(async (req, res) => {
  const result = await calculateTrustLevel(req.params.userId);
  success(res, result);
}));

// 重新计算所有用户等级（管理员）
router.post('/recalculate', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await recalculateAllTrustLevels();
  success(res, result);
}));

export default router;
