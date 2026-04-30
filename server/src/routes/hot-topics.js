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

// 获取热点列表（公开）
router.get('/', validateRequest(hotTopicQuerySchema), asyncHandler(async (req, res) => {
  const result = await getHotTopics(req.query);
  success(res, result);
}));

// 获取单个热点（公开）
router.get('/:id', asyncHandler(async (req, res) => {
  const topic = await getHotTopicById(req.params.id);
  success(res, topic);
}));

// 创建热点（需管理员权限）
router.post('/', authMiddleware, adminMiddleware, validateRequest(createHotTopicSchema), asyncHandler(async (req, res) => {
  const topic = await createHotTopic(req.body);
  created(res, topic);
}));

// 更新热点（需管理员权限）
router.put('/:id', authMiddleware, adminMiddleware, validateRequest(updateHotTopicSchema), asyncHandler(async (req, res) => {
  const updated = await updateHotTopic(req.params.id, req.body);
  success(res, updated);
}));

// 删除热点（需管理员权限）
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  await deleteHotTopic(req.params.id);
  deleted(res);
}));

// 关联帖子到热点（需管理员权限）
router.post('/:id/posts', authMiddleware, adminMiddleware, validateRequest(affiliatePostSchema), asyncHandler(async (req, res) => {
  const affiliation = await affiliatePostWithTopic(req.body.postId, req.params.id);
  created(res, affiliation);
}));

// 获取热点关联帖子（公开）
router.get('/:id/posts', asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await getTopicPosts(req.params.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  success(res, result);
}));

export default router;
