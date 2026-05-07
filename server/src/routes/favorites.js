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
import { ownershipMiddleware } from '../middleware/ownership.js';

const router = express.Router();

/**
 * @openapi
 * /api/favorites/{userId}/folders:
 *   get:
 *     tags: [收藏]
 *     summary: 获取收藏夹列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/folders', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getFavoriteFolders(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/favorites/{userId}/folders:
 *   post:
 *     tags: [收藏]
 *     summary: 创建收藏夹
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: 收藏夹名称
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/:userId/folders', ownershipMiddleware(), validateRequest(createFolderSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  const result = await createFolder(userId, name);
  created(res, result);
}));

/**
 * @openapi
 * /api/favorites/{userId}/favorites:
 *   get:
 *     tags: [收藏]
 *     summary: 获取收藏列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: folderId
 *         in: query
 *         schema:
 *           type: integer
 *         description: 收藏夹 ID
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
 */
router.get('/:userId/favorites', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { folderId, page = 1, limit = 20 } = req.query;

  const result = await getFavorites(userId, {
    folderId: folderId ? parseInt(folderId) : undefined,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

/**
 * @openapi
 * /api/favorites/{userId}/favorites:
 *   post:
 *     tags: [收藏]
 *     summary: 添加到收藏
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId]
 *             properties:
 *               targetType:
 *                 type: string
 *                 description: 目标类型
 *               targetId:
 *                 type: string
 *                 description: 目标 ID
 *               folderId:
 *                 type: integer
 *                 description: 收藏夹 ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/:userId/favorites', ownershipMiddleware(), validateRequest(addFavoriteSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { targetType, targetId, folderId } = req.body;

  const result = await addToFavorites(userId, targetType, targetId, folderId);
  success(res, result);
}));

/**
 * @openapi
 * /api/favorites/{userId}/favorites/{targetId}:
 *   delete:
 *     tags: [收藏]
 *     summary: 取消收藏
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: targetId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 目标 ID
 *       - name: targetType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 目标类型
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 缺少目标类型
 */
router.delete('/:userId/favorites/:targetId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId, targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    throw new ValidationError('缺少目标类型');
  }

  await removeFromFavorites(userId, targetType, targetId);
  deleted(res);
}));

export default router;
