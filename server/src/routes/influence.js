import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { authMiddleware } from '../services/auth.service.js';
import { calculateInfluence, getInfluenceRanking } from '../services/influence.service.js';

const router = express.Router();

// ========== 影响力 ==========

/**
 * @openapi
 * /api/influence/ranking:
 *   get:
 *     tags: [影响力]
 *     summary: 获取影响力排行
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *       - name: days
 *         in: query
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/ranking', asyncHandler(async (req, res) => {
  const { limit, days } = req.query;
  const result = await getInfluenceRanking({
    limit: limit ? Number(limit) : 50,
    days: days ? Number(days) : 30,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/influence/{userId}:
 *   get:
 *     tags: [影响力]
 *     summary: 获取用户影响力分数
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: days
 *         in: query
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { days } = req.query;
  const result = await calculateInfluence(req.params.userId, days ? Number(days) : 30);
  success(res, result);
}));

export default router;
