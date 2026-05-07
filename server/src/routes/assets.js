import express from 'express';
import {
  getAssets,
  getAssetTransactions,
  addAsset,
  consumeAsset
} from '../services/asset.service.js';
import { validateRequest } from '../middleware/validate.js';
import { assetOpSchema } from '../validations/assets.js';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { ownershipMiddleware } from '../middleware/ownership.js';

const router = express.Router();

/**
 * @openapi
 * /api/assets/{userId}:
 *   get:
 *     tags: [资产]
 *     summary: 获取用户资产列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 无权查看他人资产
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (req.user?.id !== userId && req.user?.role !== 'admin') {
    return success(res, { items: [], total: 0, message: '无法查看他人资产详情' });
  }
  const result = await getAssets(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/assets/{userId}/transactions:
 *   get:
 *     tags: [资产]
 *     summary: 获取资产流水
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 无权查看他人资产流水
 */
router.get('/:userId/transactions', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await getAssetTransactions(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

/**
 * @openapi
 * /api/assets/{userId}/add:
 *   post:
 *     tags: [资产]
 *     summary: 增加资产
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetTypeId, amount]
 *             properties:
 *               assetTypeId:
 *                 type: integer
 *                 description: 资产类型 ID
 *               amount:
 *                 type: number
 *                 description: 数量
 *               description:
 *                 type: string
 *                 description: 描述
 *               relatedBizId:
 *                 type: string
 *                 description: 关联业务 ID
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 无权操作他人资产
 */
router.post('/:userId/add', ownershipMiddleware(), validateRequest(assetOpSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { assetTypeId, amount, description, relatedBizId } = req.body;

  const result = await addAsset(userId, assetTypeId, amount, description, relatedBizId);
  success(res, result);
}));

/**
 * @openapi
 * /api/assets/{userId}/consume:
 *   post:
 *     tags: [资产]
 *     summary: 消耗资产
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetTypeId, amount]
 *             properties:
 *               assetTypeId:
 *                 type: integer
 *                 description: 资产类型 ID
 *               amount:
 *                 type: number
 *                 description: 数量
 *               description:
 *                 type: string
 *                 description: 描述
 *               relatedBizId:
 *                 type: string
 *                 description: 关联业务 ID
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 无权操作他人资产
 */
router.post('/:userId/consume', ownershipMiddleware(), validateRequest(assetOpSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { assetTypeId, amount, description, relatedBizId } = req.body;

  const result = await consumeAsset(userId, assetTypeId, amount, description, relatedBizId);
  success(res, result);
}));

export default router;
