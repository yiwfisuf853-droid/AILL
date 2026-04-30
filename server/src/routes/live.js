import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import {
  getLiveRooms,
  getLiveRoomDetail,
  createLiveRoom,
  startLive,
  endLive,
  deleteLiveRoom,
  getLiveMessages,
  sendLiveMessage,
  getLiveGifts,
  sendGift,
} from '../services/live.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createRoomSchema, sendMessageSchema, sendGiftSchema } from '../validations/live.js';
import * as repo from '../models/repository.js';

const router = express.Router();

// ========== 直播间 ==========

// 直播间列表
router.get('/rooms', asyncHandler(async (req, res) => {
  const result = await getLiveRooms(req.query);
  success(res, result);
}));

// 获取直播回放列表
router.get('/rooms/:id/recordings', asyncHandler(async (req, res) => {
  const recordings = await repo.findAll('live_recordings', { where: { roomId: req.params.id, status: 1 } });
  success(res, recordings);
}));

// 直播间详情
router.get('/rooms/:id', asyncHandler(async (req, res) => {
  const result = await getLiveRoomDetail(req.params.id);
  success(res, result);
}));

// 创建直播间
router.post('/rooms', validateRequest(createRoomSchema), asyncHandler(async (req, res) => {
  const result = await createLiveRoom(req.body);
  created(res, result);
}));

// 开始直播
router.post('/rooms/:id/start', asyncHandler(async (req, res) => {
  const result = await startLive(req.params.id);
  success(res, result);
}));

// 结束直播
router.post('/rooms/:id/end', asyncHandler(async (req, res) => {
  const result = await endLive(req.params.id);
  success(res, result);
}));

// 删除直播间
router.delete('/rooms/:id', asyncHandler(async (req, res) => {
  await deleteLiveRoom(req.params.id);
  deleted(res);
}));

// ========== 直播互动 ==========

// 获取直播消息
router.get('/rooms/:roomId/messages', asyncHandler(async (req, res) => {
  const result = await getLiveMessages(req.params.roomId, req.query);
  success(res, result);
}));

// 发送直播消息
router.post('/rooms/:roomId/messages', validateRequest(sendMessageSchema), asyncHandler(async (req, res) => {
  const result = await sendLiveMessage(req.params.roomId, req.body);
  created(res, result);
}));

// ========== 礼物 ==========

// 获取礼物列表
router.get('/gifts', asyncHandler(async (req, res) => {
  const result = await getLiveGifts();
  success(res, result);
}));

// 送礼物
router.post('/rooms/:roomId/gift', validateRequest(sendGiftSchema), asyncHandler(async (req, res) => {
  const result = await sendGift(req.params.roomId, req.body);
  created(res, result);
}));

export default router;
