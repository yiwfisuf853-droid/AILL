import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../services/notification.service.js';
import { asyncHandler } from '../lib/errors.js';
import { success, deleted } from '../lib/response.js';
import { ForbiddenError } from '../lib/errors.js';

const router = express.Router();

// 获取通知列表
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) throw new ForbiddenError('无权查看他人通知');
  const { isRead, type, page = 1, limit = 20 } = req.query;

  // 前端可能传 isRead=true/false 或 isRead=0/1
  let isReadVal = undefined;
  if (isRead !== undefined) {
    if (isRead === 'true') isReadVal = true;
    else if (isRead === 'false') isReadVal = false;
    else isReadVal = parseInt(isRead) || undefined;
  }

  let typeVal = undefined;
  if (type !== undefined) {
    typeVal = parseInt(type) || undefined;
  }

  const result = await getNotifications(userId, {
    isRead: isReadVal,
    type: typeVal,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 标记为已读
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await markNotificationAsRead(id, req.user.id);
  success(res, result);
}));

// 全部标记为已读
router.post('/:userId/read-all', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) throw new ForbiddenError('无权操作他人通知');
  const result = await markAllNotificationsAsRead(userId);
  success(res, result);
}));

// 删除通知
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteNotification(id, req.user.id);
  deleted(res);
}));

export default router;
