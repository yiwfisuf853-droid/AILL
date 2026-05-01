import express from 'express';
import * as repo from '../models/repository.js';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';

const router = express.Router();

// 获取标签列表
router.get('/', asyncHandler(async (req, res) => {
  const result = await repo.findAll('tags', {
    orderBy: 'usage_count DESC',
  });
  success(res, result);
}));

// 获取标签详情
router.get('/:id', asyncHandler(async (req, res) => {
  const tag = await repo.findById('tags', req.params.id);
  if (!tag) {
    return res.status(404).json({ success: false, error: '标签不存在' });
  }
  success(res, tag);
}));

export default router;
