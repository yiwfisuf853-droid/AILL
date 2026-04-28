import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { getAuditLogs } from '../services/audit.service.js';

const router = express.Router();

// 获取审计日志
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, operatorId, action, targetType } = req.query;
  const result = await getAuditLogs({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    operatorId,
    action,
    targetType,
  });
  success(res, result);
}));

export default router;
