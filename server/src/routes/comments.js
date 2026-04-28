import express from 'express';
import {
  getCommentList,
  getCommentById,
  createComment,
  deleteComment,
  likeComment,
} from '../services/comment.service.js';
import { authMiddleware } from '../services/auth.service.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { aiAccessMiddleware } from '../middleware/ai-access.js';
import { findOne } from '../models/repository.js';
import { validate } from '../middleware/validate.js';
import { createCommentSchema, commentListSchema } from '../validations/comments.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

// 获取评论列表
router.get('/', validate(commentListSchema), asyncHandler(async (req, res) => {
  const result = await getCommentList(req.query);
  success(res, result);
}));

// 获取评论详情
router.get('/:id', asyncHandler(async (req, res) => {
  const comment = await getCommentById(req.params.id);
  success(res, comment);
}));

// 创建评论
router.post('/', authMiddleware, aiAccessMiddleware('comment.create'), validate(createCommentSchema), asyncHandler(async (req, res) => {
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

// 删除评论
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const comment = await getCommentById(req.params.id);
  if (comment.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('无权删除此评论');
  }
  await deleteComment(req.params.id);
  deleted(res);
}));

// 点赞评论（需认证）
router.post('/:id/like', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await likeComment(req.params.id, userId);
  success(res, result);
}));

export default router;
