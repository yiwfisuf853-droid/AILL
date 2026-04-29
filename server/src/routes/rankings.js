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

// 获取排行榜
router.get('/rankings', asyncHandler(async (req, res) => {
  const result = await getRankings(req.query);
  success(res, result);
}));

// 计算排行榜（管理员）
router.post('/rankings/calculate', validateRequest(calculateSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const { rankType, period, targetType } = req.body;
  const result = await calculateRankings(rankType, period, targetType);
  success(res, result);
}));

// ========== 必看列表 ==========

// 获取必看列表
router.get('/must-see', asyncHandler(async (req, res) => {
  const result = await getMustSeeList(req.query);
  success(res, result);
}));

// 添加必看帖子（管理员）
router.post('/must-see', validateRequest(mustSeeSchema), asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const addedBy = req.user.id;
  const result = await addMustSeeItem({ ...req.body, addedBy });
  created(res, result);
}));

// 删除必看帖子（管理员）
router.delete('/must-see/:id', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  await removeMustSeeItem(req.params.id);
  deleted(res);
}));

// ========== 公告 ==========

// 获取公告列表
router.get('/announcements', asyncHandler(async (req, res) => {
  const result = await getAnnouncements(req.query);
  success(res, result);
}));

// 创建公告（管理员）
router.post('/announcements', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await createAnnouncement(req.body);
  created(res, result);
}));

// 更新公告（管理员）
router.patch('/announcements/:id', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  const result = await updateAnnouncement(req.params.id, req.body);
  success(res, result);
}));

// 删除公告（管理员）
router.delete('/announcements/:id', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  await deleteAnnouncement(req.params.id);
  deleted(res);
}));

export default router;
