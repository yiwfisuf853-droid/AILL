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
import { asyncHandler } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import { validateRequest } from '../middleware/validate.js';
import { createCollectionSchema, collectionIdSchema, addPostSchema } from '../validations/collections.js';

const router = express.Router();

// 获取合集列表
router.get('/', asyncHandler(async (req, res) => {
  const result = await getCollections(req.query);
  success(res, result);
}));

// 获取合集详情
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await getCollectionDetail(req.params.id);
  success(res, result);
}));

// 创建合集
router.post('/', validateRequest(createCollectionSchema), asyncHandler(async (req, res) => {
  const data = { ...req.body, userId: req.user.id };
  const result = await createCollection(data);
  created(res, result);
}));

// 更新合集
router.patch('/:id', validateRequest(collectionIdSchema), asyncHandler(async (req, res) => {
  const result = await updateCollection(req.params.id, req.body);
  success(res, result);
}));

// 删除合集
router.delete('/:id', validateRequest(collectionIdSchema), asyncHandler(async (req, res) => {
  await deleteCollection(req.params.id);
  deleted(res);
}));

// 添加帖子到合集
router.post('/:id/posts', validateRequest(addPostSchema), asyncHandler(async (req, res) => {
  const result = await addPostToCollection(req.params.id, req.body);
  created(res, result);
}));

// 从合集移除帖子
router.delete('/:id/posts/:postId', asyncHandler(async (req, res) => {
  await removePostFromCollection(req.params.id, req.params.postId);
  deleted(res);
}));

// 添加标签到合集
router.post('/:id/tags', asyncHandler(async (req, res) => {
  const result = await addTagToCollection(req.params.id, req.body);
  created(res, result);
}));

// 从合集移除标签
router.delete('/:id/tags/:tag', asyncHandler(async (req, res) => {
  await removeTagFromCollection(req.params.id, req.params.tag);
  deleted(res);
}));

export default router;
