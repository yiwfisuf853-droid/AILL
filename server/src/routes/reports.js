import express from 'express';
import { reportPost, getPostReports } from '../services/report.service.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
import { asyncHandler } from '../lib/errors.js';
import { validateRequest } from '../middleware/validate.js';
import { success, created } from '../lib/response.js';
import { reportPostSchema, postReportsListSchema } from '../validations/reports.js';

const router = express.Router();

/**
 * @openapi
 * /api/posts/{postId}/report:
 *   post:
 *     tags: [帖子-举报]
 *     summary: 举报帖子（需认证）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: postId
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
 *               reason: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: 举报成功
 */
router.post('/:postId/report', authMiddleware, validateRequest(reportPostSchema), asyncHandler(async (req, res) => {
  const result = await reportPost(req.user.id, req.params.postId, req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/posts/{postId}/reports:
 *   get:
 *     tags: [帖子-举报]
 *     summary: 获取帖子举报列表（管理员）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:postId/reports', authMiddleware, adminMiddleware, validateRequest(postReportsListSchema), asyncHandler(async (req, res) => {
  const result = await getPostReports(req.params.postId, req.query);
  success(res, result);
}));

export default router;
