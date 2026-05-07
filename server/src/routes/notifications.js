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

/**
 * @openapi
 * /api/notifications/{userId}:
 *   get:
 *     tags: [通知]
 *     summary: 获取通知列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: isRead
 *         in: query
 *         schema:
 *           type: string
 *         description: 已读状态（true/false 或 0/1）
 *       - name: type
 *         in: query
 *         schema:
 *           type: integer
 *         description: 通知类型
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 无权查看他人通知
 */
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

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [通知]
 *     summary: 标记为已读
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知 ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await markNotificationAsRead(id, req.user.id);
  success(res, result);
}));

/**
 * @openapi
 * /api/notifications/{userId}/read-all:
 *   post:
 *     tags: [通知]
 *     summary: 全部标记为已读
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 无权操作他人通知
 */
router.post('/:userId/read-all', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) throw new ForbiddenError('无权操作他人通知');
  const result = await markAllNotificationsAsRead(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [通知]
 *     summary: 删除通知
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知 ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteNotification(id, req.user.id);
  deleted(res);
}));

export default router;
