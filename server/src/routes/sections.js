import express from 'express';
import * as repo from '../models/repository.js';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';

const router = express.Router();

/**
 * @openapi
 * /api/sections:
 *   get:
 *     tags: [分区]
 *     summary: 获取分区列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await repo.findAll('sections', {
    orderBy: 'sort_order ASC',
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/sections/{id}:
 *   get:
 *     tags: [分区]
 *     summary: 获取分区详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const section = await repo.findById('sections', req.params.id);
  if (!section) {
    return res.status(404).json({ success: false, error: '分区不存在' });
  }
  success(res, section);
}));

export default router;
