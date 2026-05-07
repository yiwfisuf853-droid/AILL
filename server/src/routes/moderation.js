import express from 'express';
import {
  getModerationRules,
  createModerationRule,
  updateModerationRule,
  deleteModerationRule,
  getModerationRecords,
  submitForModeration,
  reviewModerationRecord,
} from '../services/moderation.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createRuleSchema, submitSchema } from '../validations/moderation.js';
import { asyncHandler } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

/**
 * @openapi
 * /api/moderation/rules:
 *   get:
 *     tags: [审核]
 *     summary: 获取审核规则列表
 *     parameters:
 *       - name: type
 *         in: query
 *         schema: { type: integer }
 *       - name: status
 *         in: query
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/rules', asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const result = await getModerationRules({
    type: type ? parseInt(type) : undefined,
    status: status ? parseInt(status) : undefined,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/moderation/rules:
 *   post:
 *     tags: [审核]
 *     summary: 创建审核规则
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ruleType: { type: string }
 *               ruleContent: { type: string }
 *               action: { type: string }
 *               status: { type: integer }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/rules', validateRequest(createRuleSchema), asyncHandler(async (req, res) => {
  const { ruleType, ruleContent, action, status } = req.body;

  const result = await createModerationRule({
    type: ruleType,
    pattern: ruleContent,
    action,
    status,
  });
  created(res, result);
}));

/**
 * @openapi
 * /api/moderation/rules/{id}:
 *   patch:
 *     tags: [审核]
 *     summary: 更新审核规则
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
 *               ruleType: { type: string }
 *               ruleContent: { type: string }
 *               action: { type: string }
 *               status: { type: integer }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/rules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const result = await updateModerationRule(id, data);
  success(res, result);
}));

/**
 * @openapi
 * /api/moderation/records:
 *   get:
 *     tags: [审核]
 *     summary: 获取审核记录列表
 *     parameters:
 *       - name: contentType
 *         in: query
 *         schema: { type: integer }
 *       - name: status
 *         in: query
 *         schema: { type: integer }
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
router.get('/records', asyncHandler(async (req, res) => {
  const { contentType, status, page = 1, limit = 20 } = req.query;

  const result = await getModerationRecords({
    targetType: contentType ? parseInt(contentType) : undefined,
    status: status ? parseInt(status) : undefined,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

/**
 * @openapi
 * /api/moderation/submit:
 *   post:
 *     tags: [审核]
 *     summary: 提交审核
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentType: { type: integer }
 *               contentId: { type: string }
 *               submitterId: { type: string }
 *     responses:
 *       200:
 *         description: 提交成功
 */
router.post('/submit', validateRequest(submitSchema), asyncHandler(async (req, res) => {
  const { contentType, contentId, submitterId } = req.body;

  const result = await submitForModeration({
    targetType: contentType,
    targetId: contentId,
    userId: submitterId,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/moderation/records/{id}:
 *   patch:
 *     tags: [审核]
 *     summary: 审核操作
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
 *               status: { type: integer }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: 操作成功
 */
router.patch('/records/:id', asyncHandler(async (req, res) => {
  const result = await reviewModerationRecord(req.params.id, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/moderation/rules/{id}:
 *   delete:
 *     tags: [审核]
 *     summary: 删除审核规则
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
router.delete('/rules/:id', asyncHandler(async (req, res) => {
  await deleteModerationRule(req.params.id);
  deleted(res);
}));

export default router;
