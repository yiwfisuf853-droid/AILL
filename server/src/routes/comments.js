import express from 'express';
import {
  getCommentList,
  getCommentById,
  getCommentReplies,
  createComment,
  deleteComment,
  likeComment,
} from '../services/comment.service.js';
import { authMiddleware } from '../services/auth.service.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { findOne } from '../models/repository.js';
import { validateRequest } from '../middleware/validate.js';
import { createCommentSchema, commentListSchema, commentRepliesSchema } from '../validations/comments.js';
import { success, created, deleted } from '../lib/response.js';
import { communityNormsMiddleware } from '../middleware/community-norms.js';

const router = express.Router();

/**
 * @openapi
 * /api/comments:
 *   get:
 *     tags: [评论]
 *     summary: 获取评论列表
 *     parameters:
 *       - name: postId
 *         in: query
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', validateRequest(commentListSchema), asyncHandler(async (req, res) => {
  const result = await getCommentList(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/comments/{id}/replies:
 *   get:
 *     tags: [评论]
 *     summary: 获取子评论列表
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/replies', validateRequest(commentRepliesSchema), asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 50 } = req.query;
  const result = await getCommentReplies(req.params.id, { page: Number(page), pageSize: Number(pageSize) });
  success(res, result);
}));

/**
 * @openapi
 * /api/comments/{id}:
 *   get:
 *     tags: [评论]
 *     summary: 获取评论详情
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
  const comment = await getCommentById(req.params.id);
  success(res, comment);
}));

/**
 * @openapi
 * /api/comments:
 *   post:
 *     tags: [评论]
 *     summary: 创建评论
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId, content]
 *             properties:
 *               postId:
 *                 type: string
 *               parentId:
 *                 type: string
 *               authorAvatar:
 *                 type: string
 *               content:
 *                 type: string
 *               replyToUserId:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authMiddleware, communityNormsMiddleware('COMMENT'), validateRequest(createCommentSchema), asyncHandler(async (req, res) => {
  const { postId, parentId, authorAvatar, content, replyToUserId } = req.body;
  const authorId = req.user.id;
  const authorName = req.user.username;

  // 获取回复对象的用户名
  let replyToUsername;
  if (replyToUserId) {
    const replyToUser = await findOne('users', { id: replyToUserId });
    replyToUsername = replyToUser?.username;
  }

  const comment = await createComment({
    postId,
    parentId,
    authorId,
    authorName,
    authorAvatar,
    content,
    replyToUserId,
    replyToUsername,
  });
  created(res, comment);
}));

/**
 * @openapi
 * /api/comments/{id}:
 *   delete:
 *     tags: [评论]
 *     summary: 删除评论（作者或管理员）
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
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const comment = await getCommentById(req.params.id);
  if (comment.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权删除此评论');
  }
  await deleteComment(req.params.id);
  deleted(res);
}));

/**
 * @openapi
 * /api/comments/{id}/like:
 *   post:
 *     tags: [评论]
 *     summary: 点赞评论
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/:id/like', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await likeComment(req.params.id, userId);
  success(res, result);
}));

export default router;
