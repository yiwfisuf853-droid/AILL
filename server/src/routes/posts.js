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
  getActiveAnnouncements,
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

router.get('/announcements', asyncHandler(async (req, res) => {
  const { limit, sectionId } = req.query;
  const announcements = await getActiveAnnouncements({ limit: limit ? Number(limit) : 10, sectionId });
  success(res, { list: announcements, total: announcements.length });
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

/**
 * @openapi
 * /api/posts/{id}:
 *   get:
 *     tags: [帖子]
 *     summary: 获取帖子详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *       - name: duration
 *         in: query
 *         schema: { type: integer }
 *         description: 浏览时长（秒）
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Post' }
 *       404:
 *         description: 帖子不存在
 */
router.get('/:id', validateRequest(postIdSchema), optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  const userId = req.user?.id;
  const duration = req.query.duration ? parseInt(req.query.duration) : undefined;
  await viewPost(req.params.id, duration, userId);
  success(res, post);
}));

/**
 * @openapi
 * /api/posts/{id}/history:
 *   get:
 *     tags: [帖子]
 *     summary: 获取帖子编辑历史
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *       - name: page
 *         in: query
 *         schema: { type: integer }
 *         description: 页码
 *       - name: limit
 *         in: query
 *         schema: { type: integer }
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
 *                 data: { type: array, items: { $ref: '#/components/schemas/EditHistory' } }
 *       401:
 *         description: 未认证
 */
router.get('/:id/history', authMiddleware, validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const result = await getPostEditHistory(req.params.id, {
    page: req.query.page,
    limit: req.query.limit,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/posts:
 *   post:
 *     tags: [帖子]
 *     summary: 创建帖子
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string, description: 帖子标题 }
 *               content: { type: string, description: 帖子内容 }
 *               sectionId: { type: string, description: 分区 ID }
 *               tags: { type: array, items: { type: string }, description: 标签列表 }
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Post' }
 *       401:
 *         description: 未认证
 */
router.post('/', authMiddleware, communityNormsMiddleware('POST'), validateRequest(createPostSchema), asyncHandler(async (req, res) => {
  const authorId = req.user.id;
  const authorName = req.user.username;
  const post = await createPost({ ...req.body, authorId, authorName });
  recordAction({
    userId: authorId,
    postId: post.id,
    targetUserId: authorId,
    actionType: ActionType.POST,
  });
  created(res, post);
}));

/**
 * @openapi
 * /api/posts/{id}:
 *   put:
 *     tags: [帖子]
 *     summary: 更新帖子
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, description: 帖子标题 }
 *               content: { type: string, description: 帖子内容 }
 *               sectionId: { type: string, description: 分区 ID }
 *               tags: { type: array, items: { type: string }, description: 标签列表 }
 *               editReason: { type: string, description: 编辑原因 }
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Post' }
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权修改此帖子
 *       404:
 *         description: 帖子不存在
 */
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

/**
 * @openapi
 * /api/posts/{id}:
 *   delete:
 *     tags: [帖子]
 *     summary: 删除帖子
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权删除此帖子
 *       404:
 *         description: 帖子不存在
 */
router.delete('/:id', authMiddleware, validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const post = await getPostById(req.params.id);
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权删除此帖子');
  }
  await deletePost(req.params.id);
  deleted(res);
}));

/**
 * @openapi
 * /api/posts/{id}/like:
 *   post:
 *     tags: [帖子]
 *     summary: 点赞帖子
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLiked: { type: boolean, description: 是否已点赞 }
 *       401:
 *         description: 未认证
 */
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

/**
 * @openapi
 * /api/posts/{id}/favorite:
 *   post:
 *     tags: [帖子]
 *     summary: 收藏帖子
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFavorited: { type: boolean, description: 是否已收藏 }
 *       401:
 *         description: 未认证
 */
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

/**
 * @openapi
 * /api/posts/{id}/share:
 *   post:
 *     tags: [帖子]
 *     summary: 分享帖子
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     shareCount: { type: integer, description: 分享数 }
 */
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

/**
 * @openapi
 * /api/posts/{id}/view:
 *   post:
 *     tags: [帖子]
 *     summary: 浏览帖子
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: 帖子 ID
 *       - name: duration
 *         in: query
 *         schema: { type: integer }
 *         description: 浏览时长（秒）
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string }
 */
router.post('/:id/view', validateRequest(postIdSchema), asyncHandler(async (req, res) => {
  const duration = req.query.duration ? parseInt(req.query.duration) : undefined;
  const userId = req.user?.id;
  await viewPost(req.params.id, duration, userId);
  success(res, { message: 'ok' });
}));

export default router;
