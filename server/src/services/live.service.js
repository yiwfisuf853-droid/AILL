import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors.js';

// ========== 直播间 ==========

/**
 * 获取直播间列表
 */
export async function getLiveRooms(options = {}) {
  const { status, page = 1, limit = 20 } = options;

  const conditions = ['deleted_at IS NULL'];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`"status" = $${idx}`);
    params.push(status);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countRes = await repo.rawQuery(`SELECT COUNT(*) as total FROM live_rooms ${whereClause}`, params);
  const total = Number(countRes.rows[0].total);
  const offset = (page - 1) * limit;
  const res = await repo.rawQuery(
    `SELECT * FROM live_rooms ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  const items = res.rows.map(r => repo.toCamelCase(r));
  return { total, page, limit, list: items };
}

/**
 * 获取直播间详情
 */
export async function getLiveRoomDetail(id) {
  const room = await repo.findOne('live_rooms', { id, deletedAt: null });
  if (!room) throw new NotFoundError('直播间不存在');

  const user = await repo.findById('users', room.userId);

  // 获取最近弹幕
  const msgRes = await repo.rawQuery(
    'SELECT * FROM live_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
    [id]
  );
  const recentMessages = msgRes.rows.map(row => repo.toCamelCase(row)).reverse();

  return {
    ...room,
    streamer: user ? { id: user.id, username: user.username, avatar: user.avatar, isAi: user.isAi } : null,
    recentMessages,
  };
}

/**
 * 创建直播间
 */
export async function createLiveRoom(data) {
  if (!data.title) throw new ValidationError('缺少直播标题');
  if (!data.userId) throw new ValidationError('缺少主播ID');

  const user = await repo.findById('users', data.userId);
  if (!user) throw new NotFoundError('用户不存在');

  // 检查是否有正在直播的房间
  const activeRoom = await repo.rawQuery(
    `SELECT * FROM live_rooms WHERE user_id = $1 AND status = 'live' AND deleted_at IS NULL`,
    [data.userId]
  );
  if (activeRoom.rows.length > 0) throw new ConflictError('已有正在直播的房间');

  const item = await repo.insert('live_rooms', {
    id: generateId(),
    userId: data.userId,
    username: user.username,
    title: data.title,
    coverImage: data.coverImage || '',
    streamUrl: '',
    status: 'pending',
    viewerCount: 0,
    likeCount: 0,
    startTime: null,
    endTime: null,
    createdAt: new Date().toISOString(),
  });

  return { success: true, item };
}

/**
 * 开始直播
 */
export async function startLive(id) {
  const room = await repo.findOne('live_rooms', { id, deletedAt: null });
  if (!room) throw new NotFoundError('直播间不存在');
  if (room.status === 'live') throw new ConflictError('已在直播中');

  const updated = await repo.update('live_rooms', id, {
    status: 'live',
    startTime: new Date().toISOString(),
  });

  return { success: true, room: updated };
}

/**
 * 结束直播
 */
export async function endLive(id) {
  const room = await repo.findOne('live_rooms', { id, deletedAt: null });
  if (!room) throw new NotFoundError('直播间不存在');
  if (room.status !== 'live') throw new ValidationError('未在直播中');

  const updated = await repo.update('live_rooms', id, {
    status: 'ended',
    endTime: new Date().toISOString(),
  });

  return { success: true, room: updated };
}

/**
 * 删除直播间
 */
export async function deleteLiveRoom(id) {
  await repo.remove('live_rooms', id);
  return { success: true };
}

// ========== 直播互动 ==========

/**
 * 获取直播消息
 */
export async function getLiveMessages(roomId, options = {}) {
  const { type, page = 1, limit = 50 } = options;

  const where = { roomId };
  if (type) where.type = Number(type);
  const result = await repo.findAll('live_messages', {
    where,
    page,
    limit,
    orderBy: 'created_at ASC',
  });

  const items = [];
  for (const m of result.list) {
    const user = await repo.findById('users', m.userId);
    items.push({
      ...m,
      sender: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
    });
  }

  return { total: result.total, page, limit, list: items };
}

/**
 * 发送直播消息
 */
export async function sendLiveMessage(roomId, data) {
  if (!data.userId) throw new ValidationError('缺少用户ID');
  if (!data.content && data.type === 1) throw new ValidationError('弹幕内容不能为空');

  const room = await repo.findOne('live_rooms', { id: roomId, deletedAt: null });
  if (!room) throw new NotFoundError('直播间不存在');

  const user = await repo.findById('users', data.userId);
  const item = await repo.insert('live_messages', {
    id: generateId(),
    roomId,
    userId: data.userId,
    username: user?.username || '',
    type: data.type || 1,
    content: data.content || '',
    createdAt: new Date().toISOString(),
  });

  // 更新直播间计数
  if (data.type === 1) {
    await repo.increment('live_rooms', roomId, 'likeCount', 1);
  } else if (data.type === 3) {
    await repo.increment('live_rooms', roomId, 'viewerCount', 1);
  }

  return { success: true, item };
}

// ========== 礼物 ==========

/**
 * 初始化礼物列表到数据库
 */
export async function initGifts() {
  const existing = await repo.count('live_gifts', {});
  if (existing > 0) return;

  const defaultGifts = [
    { name: '小花', icon: '🌸', price: 1, pointsPrice: 10, assetTypeId: 1, sortOrder: 1, status: 1 },
    { name: '点赞', icon: '👍', price: 2, pointsPrice: 20, assetTypeId: 1, sortOrder: 2, status: 1 },
    { name: '火箭', icon: '🚀', price: 10, pointsPrice: 100, assetTypeId: 1, sortOrder: 3, status: 1 },
    { name: '皇冠', icon: '👑', price: 50, pointsPrice: 500, assetTypeId: 2, sortOrder: 4, status: 1 },
    { name: '钻石', icon: '💎', price: 100, pointsPrice: 1000, assetTypeId: 3, sortOrder: 5, status: 1 },
  ];

  for (const gift of defaultGifts) {
    await repo.insert('live_gifts', {
      id: generateId(),
      ...gift,
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * 获取礼物列表
 */
export async function getLiveGifts() {
  const gifts = await repo.findAll('live_gifts', { where: { status: 1 }, orderBy: 'sort_order ASC' });
  return {
    total: gifts.length,
    list: gifts,
  };
}

/**
 * 送礼物
 */
export async function sendGift(roomId, data) {
  if (!data.userId) throw new ValidationError('缺少用户ID');
  if (!data.giftId) throw new ValidationError('缺少礼物ID');

  const gift = await repo.findOne('live_gifts', { id: data.giftId, status: 1 });
  if (!gift) throw new NotFoundError('礼物不存在');

  const amount = data.amount || 1;

  // 扣减积分
  const totalPoints = gift.pointsPrice * amount;
  const { consumeAsset } = await import('./asset.service.js');
  await consumeAsset(data.userId, gift.assetTypeId, totalPoints, `直播送礼物: ${gift.name}x${amount}`, roomId);

  // 创建消息
  return await sendLiveMessage(roomId, {
    userId: data.userId,
    type: 2, // 礼物
    content: `送出了 ${gift.icon}${gift.name} x${amount}`,
    giftId: data.giftId,
    amount,
  });
}
