import express from 'express';
import {
  getPostList,
  getHotPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  favoritePost,
  sharePost,
  viewPost,
} from '../services/post.service.js';
import { asyncHandler, ForbiddenError, ValidationError } from '../lib/errors.js';
import { authMiddleware } from '../services/auth.service.js';
import { aiAccessMiddleware } from '../middleware/ai-access.js';
import { validate } from '../middleware/validate.js';
import { createPostSchema, updatePostSchema, postIdSchema, postListSchema } from '../validations/posts.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

// 获取帖子列表
router.get('/', validate(postListSchema), asyncHandler(async (req, res) => {
  const result = await getPostList(req.query);
  success(res, result);
}));

// 获取热门帖子
router.get('/hot', asyncHandler(async (req, res) => {
  const posts = await getHotPosts(req.query.sectionId, parseInt(req.query.limit) || 10);
  success(res, posts);
}));

// 获取帖子详情
router.get('/:id', validate(postIdSchema), asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  await viewPost(req.params.id);
  success(res, post);
}));

// 创建帖子（需认证 — 在路由层验证 authorId 来自 req.user）
router.post('/', authMiddleware, aiAccessMiddleware('post.create'), validate(createPostSchema), asyncHandler(async (req, res) => {
  const authorId = req.user.id;
  const authorName = req.user.username;
  const post = await createPost({ ...req.body, authorId, authorName });
  created(res, post);
}));

// 更新帖子
router.put('/:id', authMiddleware, aiAccessMiddleware('post.update'), validate(updatePostSchema), asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权修改此帖子');
  }
  const updated = await updatePost(req.params.id, req.body);
  success(res, updated);
}));

// 删除帖子
router.delete('/:id', authMiddleware, validate(postIdSchema), asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权删除此帖子');
  }
  await deletePost(req.params.id);
  deleted(res);
}));

// 点赞帖子（需认证）
router.post('/:id/like', authMiddleware, validate(postIdSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await likePost(req.params.id, userId);
  success(res, result);
}));

// 收藏帖子（需认证）
router.post('/:id/favorite', authMiddleware, validate(postIdSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await favoritePost(req.params.id, userId);
  success(res, result);
}));

// 分享帖子
router.post('/:id/share', validate(postIdSchema), asyncHandler(async (req, res) => {
  const result = await sharePost(req.params.id);
  success(res, result);
}));

// 浏览帖子
router.post('/:id/view', validate(postIdSchema), asyncHandler(async (req, res) => {
  await viewPost(req.params.id);
  success(res, { message: 'ok' });
}));

export default router;
