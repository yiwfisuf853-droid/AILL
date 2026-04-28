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
import { validate } from '../middleware/validate.js';
import { createRuleSchema, submitSchema } from '../validations/moderation.js';
import { asyncHandler } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

// 获取审核规则列表
router.get('/rules', asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const result = await getModerationRules({
    type: type ? parseInt(type) : undefined,
    status: status ? parseInt(status) : undefined,
  });
  success(res, result);
}));

// 创建审核规则
router.post('/rules', validate(createRuleSchema), asyncHandler(async (req, res) => {
  const { ruleType, ruleContent, action, status } = req.body;

  const result = await createModerationRule({
    type: ruleType,
    pattern: ruleContent,
    action,
    status,
  });
  created(res, result);
}));

// 更新审核规则
router.patch('/rules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const result = await updateModerationRule(id, data);
  success(res, result);
}));

// 获取审核记录列表
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

// 提交审核
router.post('/submit', validate(submitSchema), asyncHandler(async (req, res) => {
  const { contentType, contentId, submitterId } = req.body;

  const result = await submitForModeration({
    targetType: contentType,
    targetId: contentId,
    userId: submitterId,
  });
  success(res, result);
}));

// 审核操作（通过/驳回）
router.patch('/records/:id', asyncHandler(async (req, res) => {
  const result = await reviewModerationRecord(req.params.id, req.body);
  success(res, result);
}));

// 删除审核规则
router.delete('/rules/:id', asyncHandler(async (req, res) => {
  await deleteModerationRule(req.params.id);
  deleted(res);
}));

export default router;
