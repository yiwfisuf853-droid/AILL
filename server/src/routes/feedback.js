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
import { authMiddleware } from '../services/auth.service.js';

const router = express.Router();

/**
 * @openapi
 * /api/feedback:
 *   post:
 *     tags: [反馈]
 *     summary: 创建反馈
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type, content]
 *             properties:
 *               userId: { type: string }
 *               type: { type: string }
 *               targetType: { type: string }
 *               targetId: { type: string }
 *               content: { type: string }
 *               attachments: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authMiddleware, validateRequest(createFeedbackSchema), asyncHandler(async (req, res) => {
  const { userId, type, targetType, targetId, content, attachments } = req.body;

  const result = await createFeedback({ userId, type, targetType, targetId, content, attachments });
  created(res, result);
}));

/**
 * @openapi
 * /api/feedback/user/{userId}:
 *   get:
 *     tags: [反馈]
 *     summary: 获取用户反馈列表
 *     parameters:
 *       - name: userId
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
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await getFeedbackList(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

/**
 * @openapi
 * /api/feedback/{id}:
 *   get:
 *     tags: [反馈]
 *     summary: 获取反馈详情
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
  const { id } = req.params;
  const result = await getFeedbackDetail(id);
  success(res, result);
}));

/**
 * @openapi
 * /api/feedback/{id}/status:
 *   patch:
 *     tags: [反馈]
 *     summary: 更新反馈状态（管理员）
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
 *               status: { type: string }
 *               handlerComment: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/:id/status', authMiddleware, asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const { id } = req.params;
  const { status, handlerComment } = req.body;

  const result = await updateFeedbackStatus(id, { status, handlerComment });
  success(res, result);
}));

export default router;
