import express from 'express';
import {
  getFavorites,
  getFavoriteFolders,
  createFolder,
  addToFavorites,
  removeFromFavorites
} from '../services/favorite.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createFolderSchema, addFavoriteSchema } from '../validations/favorites.js';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

// 获取收藏夹列表
router.get('/:userId/folders', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getFavoriteFolders(userId);
  success(res, result);
}));

// 创建收藏夹
router.post('/:userId/folders', validateRequest(createFolderSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  const result = await createFolder(userId, name);
  created(res, result);
}));

// 获取收藏列表
router.get('/:userId/favorites', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { folderId, page = 1, limit = 20 } = req.query;

  const result = await getFavorites(userId, {
    folderId: folderId ? parseInt(folderId) : undefined,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 添加到收藏
router.post('/:userId/favorites', validateRequest(addFavoriteSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { targetType, targetId, folderId } = req.body;

  const result = await addToFavorites(userId, targetType, targetId, folderId);
  success(res, result);
}));

// 取消收藏
router.delete('/:userId/favorites/:targetId', asyncHandler(async (req, res) => {
  const { userId, targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    throw new ValidationError('缺少目标类型');
  }

  await removeFromFavorites(userId, targetType, targetId);
  deleted(res);
}));

export default router;
