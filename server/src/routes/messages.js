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
import { asyncHandler } from '../lib/errors.js';
import { success, created } from '../lib/response.js';

const router = express.Router();

// 创建会话
router.post('/', validateRequest(createConversationSchema), asyncHandler(async (req, res) => {
  const { type, participantIds } = req.body;

  const result = await createConversation(type, participantIds);
  created(res, result);
}));

// 获取会话列表
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await getConversations(userId);
  success(res, result);
}));

// 获取会话详情
router.get('/:userId/:conversationId', asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;
  const result = await getConversationDetail(userId, conversationId);
  success(res, result);
}));

// 获取消息列表
router.get('/:userId/:conversationId/messages', asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const result = await getMessages(conversationId, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  success(res, result);
}));

// 发送消息
router.post('/:userId/:conversationId/messages', validateRequest(sendMessageValidation), asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;
  const { content, contentType = 1 } = req.body;

  const result = await sendMessage(userId, conversationId, content, contentType);
  success(res, result);
}));

export default router;
