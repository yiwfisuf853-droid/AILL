import express from 'express';
import {
  createFeedback,
  getFeedbackList,
  getFeedbackDetail,
  updateFeedbackStatus
} from '../services/feedback.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createFeedbackSchema } from '../validations/feedback.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { success, created } from '../lib/response.js';

const router = express.Router();

// 创建反馈
router.post('/', validateRequest(createFeedbackSchema), asyncHandler(async (req, res) => {
  const { userId, type, targetType, targetId, content, attachments } = req.body;

  const result = await createFeedback({ userId, type, targetType, targetId, content, attachments });
  created(res, result);
}));

// 获取用户反馈列表
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await getFeedbackList(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 获取反馈详情
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await getFeedbackDetail(id);
  success(res, result);
}));

// 更新反馈状态 (管理员)
router.patch('/:id/status', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const { id } = req.params;
  const { status, handlerComment } = req.body;

  const result = await updateFeedbackStatus(id, { status, handlerComment });
  success(res, result);
}));

export default router;
