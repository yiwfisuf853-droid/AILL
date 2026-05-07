import express from 'express';
import {
  getCollections,
  getCollectionDetail,
  createCollection,
  updateCollection,
  deleteCollection,
  addPostToCollection,
  removePostFromCollection,
  addTagToCollection,
  removeTagFromCollection,
} from '../services/collection.service.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../services/auth.service.js';
import { createCollectionSchema, collectionIdSchema, addPostSchema } from '../validations/collections.js';

const router = express.Router();

/**
 * @openapi
 * /api/collections:
 *   get:
 *     tags: [合集]
 *     summary: 获取合集列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await getCollections(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/collections/{id}:
 *   get:
 *     tags: [合集]
 *     summary: 获取合集详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await getCollectionDetail(req.params.id);
  success(res, result);
}));

/**
 * @openapi
 * /api/collections:
 *   post:
 *     tags: [合集]
 *     summary: 创建合集（需认证）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               coverImage: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authMiddleware, validateRequest(createCollectionSchema), asyncHandler(async (req, res) => {
  const data = { ...req.body, userId: req.user.id };
  const result = await createCollection(data);
  created(res, result);
}));

/**
 * @openapi
 * /api/collections/{id}:
 *   patch:
 *     tags: [合集]
 *     summary: 更新合集（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               coverImage: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/:id', authMiddleware, validateRequest(collectionIdSchema), asyncHandler(async (req, res) => {
  const collection = await getCollectionDetail(req.params.id);
  if (collection.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权修改此合集');
  }
  const result = await updateCollection(req.params.id, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/collections/{id}:
 *   delete:
 *     tags: [合集]
 *     summary: 删除合集（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', authMiddleware, validateRequest(collectionIdSchema), asyncHandler(async (req, res) => {
  const collection = await getCollectionDetail(req.params.id);
  if (collection.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权删除此合集');
  }
  await deleteCollection(req.params.id);
  deleted(res);
}));

/**
 * @openapi
 * /api/collections/{id}/posts:
 *   post:
 *     tags: [合集]
 *     summary: 添加帖子到合集（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId: { type: string }
 *     responses:
 *       201:
 *         description: 添加成功
 */
router.post('/:id/posts', authMiddleware, validateRequest(addPostSchema), asyncHandler(async (req, res) => {
  const collection = await getCollectionDetail(req.params.id);
  if (collection.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权操作此合集');
  }
  const result = await addPostToCollection(req.params.id, req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/collections/{id}/posts/{postId}:
 *   delete:
 *     tags: [合集]
 *     summary: 从合集移除帖子（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: postId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 移除成功
 */
router.delete('/:id/posts/:postId', authMiddleware, asyncHandler(async (req, res) => {
  const collection = await getCollectionDetail(req.params.id);
  if (collection.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权操作此合集');
  }
  await removePostFromCollection(req.params.id, req.params.postId);
  deleted(res);
}));

/**
 * @openapi
 * /api/collections/{id}/tags:
 *   post:
 *     tags: [合集]
 *     summary: 添加标签到合集（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tag: { type: string }
 *     responses:
 *       201:
 *         description: 添加成功
 */
router.post('/:id/tags', authMiddleware, asyncHandler(async (req, res) => {
  const collection = await getCollectionDetail(req.params.id);
  if (collection.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权操作此合集');
  }
  const result = await addTagToCollection(req.params.id, req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/collections/{id}/tags/{tag}:
 *   delete:
 *     tags: [合集]
 *     summary: 从合集移除标签（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: tag
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 移除成功
 */
router.delete('/:id/tags/:tag', authMiddleware, asyncHandler(async (req, res) => {
  const collection = await getCollectionDetail(req.params.id);
  if (collection.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权操作此合集');
  }
  await removeTagFromCollection(req.params.id, req.params.tag);
  deleted(res);
}));

export default router;
