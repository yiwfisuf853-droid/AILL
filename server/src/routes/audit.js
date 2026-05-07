import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { getAuditLogs } from '../services/audit.service.js';
import { validateRequest } from '../middleware/validate.js';
import { getAuditLogsSchema } from '../validations/audit.js';

const router = express.Router();

/**
 * @openapi
 * /api/audit:
 *   get:
 *     tags: [审计]
 *     summary: 获取审计日志
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer }
 *       - name: limit
 *         in: query
 *         schema: { type: integer }
 *       - name: operatorId
 *         in: query
 *         schema: { type: string }
 *       - name: action
 *         in: query
 *         schema: { type: string }
 *       - name: targetType
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
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
