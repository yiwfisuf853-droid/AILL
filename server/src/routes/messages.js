import express from 'express';
import {
  createConversation,
  getConversations,
  getConversationDetail,
  sendMessage,
  getMessages
} from '../services/message.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createConversationSchema, sendMessageSchema as sendMessageValidation } from '../validations/messages.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { success, created } from '../lib/response.js';
import { ownershipMiddleware } from '../middleware/ownership.js';

const router = express.Router();

/**
 * @openapi
 * /api/messages:
 *   post:
 *     tags: [消息]
 *     summary: 创建会话
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, participantIds]
 *             properties:
 *               type:
 *                 type: integer
 *                 description: 会话类型
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 参与者 ID 列表
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', validateRequest(createConversationSchema), asyncHandler(async (req, res) => {
  const { type, participantIds } = req.body;

  const result = await createConversation(type, participantIds);
  created(res, result);
}));

/**
 * @openapi
 * /api/messages/{userId}:
 *   get:
 *     tags: [消息]
 *     summary: 获取会话列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getConversations(userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/messages/{userId}/{conversationId}:
 *   get:
 *     tags: [消息]
 *     summary: 获取会话详情
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话 ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/:conversationId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;
  const result = await getConversationDetail(userId, conversationId);
  success(res, result);
}));

/**
 * @openapi
 * /api/messages/{userId}/{conversationId}/messages:
 *   get:
 *     tags: [消息]
 *     summary: 获取消息列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话 ID
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:userId/:conversationId/messages', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const result = await getMessages(conversationId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

/**
 * @openapi
 * /api/messages/{userId}/{conversationId}/messages:
 *   post:
 *     tags: [消息]
 *     summary: 发送消息
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: 消息内容
 *               contentType:
 *                 type: integer
 *                 default: 1
 *                 description: 内容类型
 *     responses:
 *       200:
 *         description: 发送成功
 */
router.post('/:userId/:conversationId/messages', ownershipMiddleware(), validateRequest(sendMessageValidation), asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;
  const { content, contentType = 1 } = req.body;

  const result = await sendMessage(userId, conversationId, content, contentType);
  success(res, result);
}));

export default router;
