import express from 'express';
import { asyncHandler, ValidationError, ForbiddenError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import {
  getRankings,
  calculateRankings,
  getMustSeeList,
  addMustSeeItem,
  removeMustSeeItem,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../services/ranking.service.js';
import { validateRequest } from '../middleware/validate.js';
import { calculateSchema, mustSeeSchema } from '../validations/rankings.js';

const router = express.Router();

// ========== 排行榜 ==========

/**
 * @openapi
 * /api/rankings/rankings:
 *   get:
 *     tags: [排行榜]
 *     summary: 获取排行榜
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/rankings', asyncHandler(async (req, res) => {
  const result = await getRankings(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/rankings/rankings/calculate:
 *   post:
 *     tags: [排行榜]
 *     summary: 计算排行榜（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rankType: { type: string }
 *               period: { type: string }
 *               targetType: { type: string }
 *     responses:
 *       200:
 *         description: 计算完成
 */
router.post('/rankings/calculate', validateRequest(calculateSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const { rankType, period, targetType } = req.body;
  const result = await calculateRankings(rankType, period, targetType);
  success(res, result);
}));

// ========== 必看列表 ==========

/**
 * @openapi
 * /api/rankings/must-see:
 *   get:
 *     tags: [排行榜]
 *     summary: 获取必看列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/must-see', asyncHandler(async (req, res) => {
  const result = await getMustSeeList(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/rankings/must-see:
 *   post:
 *     tags: [排行榜]
 *     summary: 添加必看帖子（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId: { type: string }
 *     responses:
 *       201:
 *         description: 添加成功
 */
router.post('/must-see', validateRequest(mustSeeSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const addedBy = req.user.id;
  const result = await addMustSeeItem({ ...req.body, addedBy });
  created(res, result);
}));

/**
 * @openapi
 * /api/rankings/must-see/{id}:
 *   delete:
 *     tags: [排行榜]
 *     summary: 删除必看帖子（管理员）
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
router.delete('/must-see/:id', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  await removeMustSeeItem(req.params.id);
  deleted(res);
}));

// ========== 公告 ==========

/**
 * @openapi
 * /api/rankings/announcements:
 *   get:
 *     tags: [排行榜]
 *     summary: 获取公告列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/announcements', asyncHandler(async (req, res) => {
  const result = await getAnnouncements(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/rankings/announcements:
 *   post:
 *     tags: [排行榜]
 *     summary: 创建公告（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/announcements', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await createAnnouncement(req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/rankings/announcements/{id}:
 *   patch:
 *     tags: [排行榜]
 *     summary: 更新公告（管理员）
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
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/announcements/:id', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await updateAnnouncement(req.params.id, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/rankings/announcements/{id}:
 *   delete:
 *     tags: [排行榜]
 *     summary: 删除公告（管理员）
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
router.delete('/announcements/:id', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  await deleteAnnouncement(req.params.id);
  deleted(res);
}));

export default router;
