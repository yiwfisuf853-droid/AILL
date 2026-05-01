import express from 'express';
import { reportPost, getPostReports } from '../services/report.service.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
import { asyncHandler } from '../lib/errors.js';
import { validateRequest } from '../middleware/validate.js';
import { success, created } from '../lib/response.js';
import { reportPostSchema, postReportsListSchema } from '../validations/reports.js';

const router = express.Router();

// 举报帖子
router.post('/:postId/report', authMiddleware, validateRequest(reportPostSchema), asyncHandler(async (req, res) => {
  const result = await reportPost(req.user.id, req.params.postId, req.body);
  created(res, result);
}));

// 获取帖子举报列表（管理员）
router.get('/:postId/reports', authMiddleware, adminMiddleware, validateRequest(postReportsListSchema), asyncHandler(async (req, res) => {
  const result = await getPostReports(req.params.postId, req.query);
  success(res, result);
}));

export default router;
