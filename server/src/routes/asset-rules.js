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

// 手动评估（需认证，放在 /:id 之前避免参数路由拦截）
router.post('/evaluate', authMiddleware, validateRequest(evaluateRuleSchema), asyncHandler(async (req, res) => {
  const { userId, eventType } = req.body;
  const result = await evaluateAssetRule(userId, eventType);
  success(res, result);
}));

// 规则列表（需管理员权限）
router.get('/', authMiddleware, adminMiddleware, validateRequest(ruleQuerySchema), asyncHandler(async (req, res) => {
  const result = await listAssetRules(req.query);
  success(res, result);
}));

// 规则详情（需管理员权限）
router.get('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const rule = await getAssetRule(req.params.id);
  success(res, rule);
}));

// 创建规则（需管理员权限）
router.post('/', authMiddleware, adminMiddleware, validateRequest(createRuleSchema), asyncHandler(async (req, res) => {
  const rule = await createAssetRule(req.body);
  created(res, rule);
}));

// 更新规则（需管理员权限）
router.put('/:id', authMiddleware, adminMiddleware, validateRequest(updateRuleSchema), asyncHandler(async (req, res) => {
  const updated = await updateAssetRule(req.params.id, req.body);
  success(res, updated);
}));

// 删除规则（需管理员权限）
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  await deleteAssetRule(req.params.id);
  deleted(res);
}));

export default router;
