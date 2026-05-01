import express from 'express';
import {
  getPostList,
  getHotPosts,
  getFollowingPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  favoritePost,
  sharePost,
  viewPost,
  searchPosts,
} from '../services/post.service.js';
import { asyncHandler, ForbiddenError, ValidationError } from '../lib/errors.js';
import { authMiddleware, optionalAuthMiddleware } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createPostSchema, updatePostSchema, postIdSchema, postListSchema, searchPostsSchema } from '../validations/posts.js';
import { success, created, deleted } from '../lib/response.js';
import { recordAction, ActionType } from '../services/action-trace.service.js';
import { recordEditHistory, getPostEditHistory } from '../services/edit-history.service.js';
import { communityNormsMiddleware } from '../middleware/community-norms.js';

const router = express.Router();

/**
 * @openapi
 * /api/posts:
 *   get:
 *     tags: [帖子]
 *     summary: 获取帖子列表
 *     parameters:
 *       - name: sectionId
 *         in: query
 *         schema: { type: string }
 *         description: 分区 ID
 *       - name: authorId
 *         in: query
 *         schema: { type: string }
 *         description: 作者 ID
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 20 }
 *         description: 每页数量
 *       - name: sortBy
 *         in: query
 *         schema: { type: string }
 *         description: 排序方式
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Post' } }
 */
router.get('/', validateRequest(postListSchema), asyncHandler(async (req, res) => {
  const result = await getPostList(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/posts/search:
 *   get:
 *     tags: [帖子]
 *     summary: 搜索帖子
 *     parameters:
 *       - name: keyword
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: 搜索关键词
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 20 }
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Post' } }
 */
router.get('/search', validateRequest(searchPostsSchema), asyncHandler(async (req, res) => {
  const result = await searchPosts(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/posts/following:
 *   get:
 *     tags: [帖子]
 *     summary: 获取关注用户的帖子流
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 20 }
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Post' } }
 *       401:
 *         description: 未认证
 */
router.get('/following', authMiddleware, asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const result = await getFollowingPosts(req.user.id, {
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/posts/hot:
 *   get:
 *     tags: [帖子]
 *     summary: 获取热门帖子
 *     parameters:
 *       - name: sectionId
 *         in: query
 *         schema: { type: string }
 *         description: 分区 ID
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *         description: 返回数量
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Post' } }
 */
router.get('/hot', asyncHandler(async (req, res) => {
  const posts = await getHotPosts(req.query.sectionId, parseInt(req.query.limit) || 10);
  success(res, posts);
}));

// 获取帖子详情（可选认证，记录浏览行为）
router.get('/:id', validateRequest(postIdSchema), optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  const userId = req.user?.id;
  const duration = req.query.duration ? parseInt(req.query.duration) : undefined;
  await viewPost(req.params.id, duration, userId);
  success(res, post);
}));

// 获取帖子编辑历史（需认证）
router.get('/:id/history', authMiddleware, validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const result = await getPostEditHistory(req.params.id, {
    page: req.query.page,
    limit: req.query.limit,
  });
  success(res, result);
}));

// 创建帖子（需认证 — 在路由层验证 authorId 来自 req.user）
router.post('/', authMiddleware, communityNormsMiddleware('POST'), validateRequest(createPostSchema), asyncHandler(async (req, res) => {
  const authorId = req.user.id;
  const authorName = req.user.username;
  const post = await createPost({ ...req.body, authorId, authorName });
  created(res, post);
}));

// 更新帖子
router.put('/:id', authMiddleware, validateRequest(updatePostSchema), asyncHandler(async (req, res) => {
  const currentPost = await getPostById(req.params.id);
  if (currentPost.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权修改此帖子');
  }
  const updated = await updatePost(req.params.id, req.body);
  await recordEditHistory({
    postId: req.params.id,
    editorId: req.user.id,
    titleBefore: currentPost.title,
    titleAfter: updated.title,
    contentBefore: currentPost.content,
    contentAfter: updated.content,
    reason: req.body.editReason,
  });
  success(res, updated);
}));

// 删除帖子
router.delete('/:id', authMiddleware, validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权删除此帖子');
  }
  await deletePost(req.params.id);
  deleted(res);
}));

// 点赞帖子（需认证）
router.post('/:id/like', authMiddleware, validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await likePost(req.params.id, userId);
  // 记录点赞/取消点赞行为
  if (result.isLiked) {
    const post = await getPostById(req.params.id);
    recordAction({
      userId,
      postId: req.params.id,
      targetUserId: post.authorId,
      actionType: ActionType.LIKE,
    });
  }
  success(res, result);
}));

// 收藏帖子（需认证）
router.post('/:id/favorite', authMiddleware, validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await favoritePost(req.params.id, userId);
  // 记录收藏/取消收藏行为
  if (result.isFavorited) {
    const post = await getPostById(req.params.id);
    recordAction({
      userId,
      postId: req.params.id,
      targetUserId: post.authorId,
      actionType: ActionType.FAVORITE,
    });
  }
  success(res, result);
}));

// 分享帖子
router.post('/:id/share', validateRequest(postIdSchema), optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const result = await sharePost(req.params.id);
  // 记录分享行为
  if (req.user) {
    const post = await getPostById(req.params.id);
    recordAction({
      userId: req.user.id,
      postId: req.params.id,
      targetUserId: post.authorId,
      actionType: ActionType.SHARE,
    });
  }
  success(res, result);
}));

// 浏览帖子
router.post('/:id/view', validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const duration = req.query.duration ? parseInt(req.query.duration) : undefined;
  const userId = req.user?.id;
  await viewPost(req.params.id, duration, userId);
  success(res, { message: 'ok' });
}));

export default router;
