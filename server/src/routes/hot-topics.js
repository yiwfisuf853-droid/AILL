import express from 'express';
import {
  createHotTopic,
  getHotTopics,
  getHotTopicById,
  updateHotTopic,
  deleteHotTopic,
  affiliatePostWithTopic,
  removePostAffiliation,
  getTopicPosts,
} from '../services/hot-topic.service.js';
import { asyncHandler } from '../lib/errors.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createHotTopicSchema,
  updateHotTopicSchema,
  affiliatePostSchema,
  hotTopicQuerySchema,
} from '../validations/hot-topic.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

/**
 * @openapi
 * /api/hot-topics:
 *   get:
 *     tags: [热点]
 *     summary: 获取热点列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', validateRequest(hotTopicQuerySchema), asyncHandler(async (req, res) => {
  const result = await getHotTopics(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/hot-topics/{id}:
 *   get:
 *     tags: [热点]
 *     summary: 获取单个热点
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
  const topic = await getHotTopicById(req.params.id);
  success(res, topic);
}));

/**
 * @openapi
 * /api/hot-topics:
 *   post:
 *     tags: [热点]
 *     summary: 创建热点（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authMiddleware, adminMiddleware, validateRequest(createHotTopicSchema), asyncHandler(async (req, res) => {
  const topic = await createHotTopic(req.body);
  created(res, topic);
}));

/**
 * @openapi
 * /api/hot-topics/{id}:
 *   put:
 *     tags: [热点]
 *     summary: 更新热点（管理员）
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
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', authMiddleware, adminMiddleware, validateRequest(updateHotTopicSchema), asyncHandler(async (req, res) => {
  const updated = await updateHotTopic(req.params.id, req.body);
  success(res, updated);
}));

/**
 * @openapi
 * /api/hot-topics/{id}:
 *   delete:
 *     tags: [热点]
 *     summary: 删除热点（管理员）
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
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  await deleteHotTopic(req.params.id);
  deleted(res);
}));

/**
 * @openapi
 * /api/hot-topics/{id}/posts:
 *   post:
 *     tags: [热点]
 *     summary: 关联帖子到热点（管理员）
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
 *         description: 关联成功
 */
router.post('/:id/posts', authMiddleware, adminMiddleware, validateRequest(affiliatePostSchema), asyncHandler(async (req, res) => {
  const affiliation = await affiliatePostWithTopic(req.body.postId, req.params.id);
  created(res, affiliation);
}));

/**
 * @openapi
 * /api/hot-topics/{id}/posts:
 *   get:
 *     tags: [热点]
 *     summary: 获取热点关联帖子
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/posts', asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await getTopicPosts(req.params.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  success(res, result);
}));

export default router;
