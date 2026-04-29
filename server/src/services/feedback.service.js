import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * 创建反馈
 */
export async function createFeedback(data) {
  const feedback = await repo.insert('feedbacks', {
    id: generateId(),
    userId: data.userId,
    type: data.type,
    title: data.title || '',
    content: data.content,
    status: 1,
    adminReply: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, feedback };
}

/**
 * 获取反馈列表
 */
export async function getFeedbackList(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const result = await repo.findAll('feedbacks', {
    where: { userId },
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  const list = result.list.map(f => ({
    id: f.id,
    type: f.type,
    typeName: getTypeName(f.type),
    content: f.content,
    status: f.status,
    statusName: getStatusName(f.status),
    adminReply: f.adminReply,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));

  return {
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: page * limit < result.total,
    list,
  };
}

/**
 * 获取反馈详情
 */
export async function getFeedbackDetail(id) {
  const feedback = await repo.findById('feedbacks', id);
  if (!feedback) {
    throw new NotFoundError('反馈不存在');
  }

  const user = await repo.findById('users', feedback.userId);

  return {
    id: feedback.id,
    type: feedback.type,
    typeName: getTypeName(feedback.type),
    content: feedback.content,
    status: feedback.status,
    statusName: getStatusName(feedback.status),
    adminReply: feedback.adminReply,
    user: user ? {
      id: user.id,
      username: user.username,
    } : null,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

/**
 * 更新反馈状态
 */
export async function updateFeedbackStatus(id, data) {
  const feedback = await repo.findById('feedbacks', id);
  if (!feedback) {
    throw new NotFoundError('反馈不存在');
  }

  const updateData = { updatedAt: new Date().toISOString() };
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.adminReply !== undefined) {
    updateData.adminReply = data.adminReply;
  }

  const updated = await repo.update('feedbacks', id, updateData);

  return { success: true, feedback: updated };
}

function getTypeName(type) {
  const names = {
    1: '举报',
    2: '建议',
    3: '投诉',
    4: '求助',
  };
  return names[type] || '未知';
}

function getStatusName(status) {
  const names = {
    1: '待处理',
    2: '已处理',
    3: '已回复',
  };
  return names[status] || '未知';
}