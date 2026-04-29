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

const router = express.Router();

// 获取用户资产列表
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getAssets(userId);
  success(res, result);
}));

// 获取资产流水
router.get('/:userId/transactions', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await getAssetTransactions(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 增加资产 (奖励等)
router.post('/:userId/add', validateRequest(assetOpSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { assetTypeId, amount, description, relatedBizId } = req.body;

  const result = await addAsset(userId, assetTypeId, amount, description, relatedBizId);
  success(res, result);
}));

// 消耗资产 (购买等)
router.post('/:userId/consume', validateRequest(assetOpSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { assetTypeId, amount, description, relatedBizId } = req.body;

  const result = await consumeAsset(userId, assetTypeId, amount, description, relatedBizId);
  success(res, result);
}));

export default router;
