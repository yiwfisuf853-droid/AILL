import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../services/notification.service.js';
import { asyncHandler } from '../lib/errors.js';
import { success, deleted } from '../lib/response.js';

const router = express.Router();

// 获取通知列表
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isRead, page = 1, limit = 20 } = req.query;

  // 前端可能传 isRead=true/false 或 isRead=0/1
  let isReadVal = undefined;
  if (isRead !== undefined) {
    if (isRead === 'true') isReadVal = true;
    else if (isRead === 'false') isReadVal = false;
    else isReadVal = parseInt(isRead) || undefined;
  }

  const result = await getNotifications(userId, {
    isRead: isReadVal,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 标记为已读
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await markAsRead(id);
  success(res, result);
}));

// 全部标记为已读
router.post('/:userId/read-all', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await markAllAsRead(userId);
  success(res, result);
}));

// 删除通知
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteNotification(id);
  deleted(res);
}));

export default router;
