import express from 'express';
import { asyncHandler, ForbiddenError, NotFoundError } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
import { followUser, unfollowUser, checkRelationship } from '../services/relationship.service.js';
import { validateRequest } from '../middleware/validate.js';
import { updateProfileSchema, followSchema } from '../validations/users.js';
import { createAuditLog } from '../services/audit.service.js';
import { calculateTrustLevel } from '../services/trust-level.service.js';
import * as repo from '../models/repository.js';

const router = express.Router();

// 管理员：获取用户列表
router.get('/admin/list', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const { search, page = 1, pageSize = 50 } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let idx = 1;
  if (search) {
    whereClause += ` AND (username ILIKE $${idx} OR email ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }
  const countRes = await repo.rawQuery(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
  const total = Number(countRes.rows[0].total);
  const offset = (+page - 1) * (+pageSize);
  const listRes = await repo.rawQuery(
    `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, +pageSize, offset]
  );
  const list = listRes.rows.map(u => {
    const { password, ...safe } = repo.toCamelCase(u);
    return { ...safe, status: u.deleted_at ? 0 : 1 };
  });
  res.json({ total, list });
}));

// 管理员：切换用户状态（禁用/启用）
router.patch('/admin/:id/status', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const user = await repo.findOne('users', { id: req.params.id });
  if (!user) throw new NotFoundError('用户不存在');
  if (user.role === 'admin') throw new ForbiddenError('不能禁用管理员');
  const newDeletedAt = user.deletedAt ? null : new Date().toISOString();
  await repo.update('users', req.params.id, { deletedAt: newDeletedAt, updatedAt: new Date().toISOString() });
  await createAuditLog({
    operatorId: req.user.id,
    operatorName: req.user.username,
    action: newDeletedAt ? 'disable_user' : 'enable_user',
    targetType: 'user',
    targetId: user.id,
    detail: `管理员 ${req.user.username} ${newDeletedAt ? '禁用' : '启用'}了用户 ${user.username}`,
    ip: req.ip,
  });
  const { password, ...safeUser } = user;
  success(res, { ...safeUser, status: newDeletedAt ? 0 : 1 });
}));

// 更新用户资料
router.put('/:id', authMiddleware, validateRequest(updateProfileSchema), asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id) {
    throw new ForbiddenError('无权修改他人资料');
  }
  const { username, avatar, bio, email } = req.body;

  const user = await repo.findOne('users', { id: req.params.id });
  if (!user) throw new NotFoundError('用户不存在');
  const updates = { updatedAt: new Date().toISOString() };
  if (username !== undefined) updates.username = username;
  if (avatar !== undefined) updates.avatar = avatar;
  if (bio !== undefined) updates.bio = bio;
  if (email !== undefined) updates.email = email;
  const updated = await repo.update('users', req.params.id, updates);
  const { password, ...safeUser } = updated;
  success(res, safeUser);
}));

// 获取用户信息
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await repo.findOne('users', { id: req.params.id });
  if (!user) throw new NotFoundError('用户不存在');
  const trustInfo = await calculateTrustLevel(user.id);
  const { password, ...safeUser } = { ...user, trustLevel: trustInfo.level, trustLevelName: trustInfo.name };
  success(res, safeUser);
}));

// 获取用户帖子
router.get('/:id/posts', asyncHandler(async (req, res) => {
  const result = await repo.findAll('posts', {
    where: { authorId: req.params.id },
    orderBy: 'created_at DESC',
  });
  success(res, result.filter(p => !p.deletedAt));
}));

// 关注/取关用户（需认证）
router.post('/:id/follow', authMiddleware, validateRequest(followSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const targetUserId = req.params.id;
  const rel = await checkRelationship(userId, targetUserId);
  let result;
  if (rel.isFollowing) {
    result = await unfollowUser(userId, targetUserId);
    result.isFollowing = false;
  } else {
    result = await followUser(userId, targetUserId);
    result.isFollowing = true;
  }
  success(res, result);
}));

export default router;
