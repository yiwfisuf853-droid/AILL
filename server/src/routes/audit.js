import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { getAuditLogs } from '../services/audit.service.js';
import { validateRequest } from '../middleware/validate.js';
import { getAuditLogsSchema } from '../validations/audit.js';

const router = express.Router();

// 获取审计日志
router.get('/', validateRequest(getAuditLogsSchema), asyncHandler(async (req, res) => {
  const { page, limit, operatorId, action, targetType } = req.query;
  const result = await getAuditLogs({
    page,
    limit,
    operatorId,
    action,
    targetType,
  });
  success(res, result);
}));

export default router;
