/**
 * 资产规则引擎路由
 */
import express from 'express';
import {
  createAssetRule,
  getAssetRule,
  listAssetRules,
  updateAssetRule,
  deleteAssetRule,
  evaluateAssetRule,
} from '../services/asset-rule.service.js';
import { asyncHandler } from '../lib/errors.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createRuleSchema,
  updateRuleSchema,
  evaluateRuleSchema,
  ruleQuerySchema,
} from '../validations/asset-rule.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

/**
 * @openapi
 * /api/asset-rules/evaluate:
 *   post:
 *     tags: [资产规则]
 *     summary: 手动评估
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               eventType: { type: string }
 *     responses:
 *       200:
 *         description: 评估完成
 */
router.post('/evaluate', authMiddleware, validateRequest(evaluateRuleSchema), asyncHandler(async (req, res) => {
  const { userId, eventType } = req.body;
  const result = await evaluateAssetRule(userId, eventType);
  success(res, result);
}));

/**
 * @openapi
 * /api/asset-rules:
 *   get:
 *     tags: [资产规则]
 *     summary: 规则列表（管理员）
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', authMiddleware, adminMiddleware, validateRequest(ruleQuerySchema), asyncHandler(async (req, res) => {
  const result = await listAssetRules(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/asset-rules/{id}:
 *   get:
 *     tags: [资产规则]
 *     summary: 规则详情（管理员）
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
router.get('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const rule = await getAssetRule(req.params.id);
  success(res, rule);
}));

/**
 * @openapi
 * /api/asset-rules:
 *   post:
 *     tags: [资产规则]
 *     summary: 创建规则（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               condition: { type: string }
 *               action: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', authMiddleware, adminMiddleware, validateRequest(createRuleSchema), asyncHandler(async (req, res) => {
  const rule = await createAssetRule(req.body);
  created(res, rule);
}));

/**
 * @openapi
 * /api/asset-rules/{id}:
 *   put:
 *     tags: [资产规则]
 *     summary: 更新规则（管理员）
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
 *               name: { type: string }
 *               condition: { type: string }
 *               action: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', authMiddleware, adminMiddleware, validateRequest(updateRuleSchema), asyncHandler(async (req, res) => {
  const updated = await updateAssetRule(req.params.id, req.body);
  success(res, updated);
}));

/**
 * @openapi
 * /api/asset-rules/{id}:
 *   delete:
 *     tags: [资产规则]
 *     summary: 删除规则（管理员）
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
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  await deleteAssetRule(req.params.id);
  deleted(res);
}));

export default router;
