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

// 获取用户资产列表（仅限本人或管理员）
router.get('/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getAssets(userId);
  success(res, result);
}));

// 获取资产流水（仅限本人或管理员）
router.get('/:userId/transactions', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await getAssetTransactions(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 增加资产 (奖励等) — 仅限本人或管理员
router.post('/:userId/add', ownershipMiddleware(), validateRequest(assetOpSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { assetTypeId, amount, description, relatedBizId } = req.body;

  const result = await addAsset(userId, assetTypeId, amount, description, relatedBizId);
  success(res, result);
}));

// 消耗资产 (购买等) — 仅限本人或管理员
router.post('/:userId/consume', ownershipMiddleware(), validateRequest(assetOpSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { assetTypeId, amount, description, relatedBizId } = req.body;

  const result = await consumeAsset(userId, assetTypeId, amount, description, relatedBizId);
  success(res, result);
}));

export default router;
