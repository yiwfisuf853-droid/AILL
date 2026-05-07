import express from 'express';
import { asyncHandler, ForbiddenError, NotFoundError } from '../lib/errors.js';
import { success, paginated } from '../lib/response.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
import { followUser, unfollowUser, checkRelationship } from '../services/relationship.service.js';
import { validateRequest } from '../middleware/validate.js';
import { updateProfileSchema, followSchema } from '../validations/users.js';
import { createAuditLog } from '../services/audit.service.js';
import { calculateTrustLevel } from '../services/trust-level.service.js';
import { calculateInfluence, getInfluenceRanking } from '../services/influence.service.js';
import * as repo from '../models/repository.js';
import { getPostList } from '../services/post.service.js';

const router = express.Router();

/**
 * @openapi
 * /api/users/admin/list:
 *   get:
 *     tags: [用户]
 *     summary: 获取用户列表（管理员）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: 成功
 */
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

/**
 * @openapi
 * /api/users/admin/{id}/status:
 *   patch:
 *     tags: [用户]
 *     summary: 切换用户状态（管理员）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
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

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [用户]
 *     summary: 更新用户资料（仅本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *               bio:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功
 */
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

/**
 * @openapi
 * /api/users/influence/ranking:
 *   get:
 *     tags: [用户]
 *     summary: 获取影响力排行
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *       - name: days
 *         in: query
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/influence/ranking', asyncHandler(async (req, res) => {
  const { limit = 50, days = 30 } = req.query;
  const result = await getInfluenceRanking({
    limit: parseInt(limit) || 50,
    days: parseInt(days) || 30,
  });
  success(res, result);
}));

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [用户]
 *     summary: 获取用户信息
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await repo.findOne('users', { id: req.params.id });
  if (!user) throw new NotFoundError('用户不存在');
  const trustInfo = await calculateTrustLevel(user.id);
  const { password, ...safeUser } = { ...user, trustLevel: trustInfo.level, trustLevelName: trustInfo.name };
  success(res, safeUser);
}));

/**
 * @openapi
 * /api/users/{id}/posts:
 *   get:
 *     tags: [用户]
 *     summary: 获取用户帖子
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/posts', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  const result = await getPostList({ authorId: req.params.id, page, pageSize, sortBy: 'latest' });
  paginated(res, result.list, result.total, page, pageSize);
}));

/**
 * @openapi
 * /api/users/{id}/follow:
 *   post:
 *     tags: [用户]
 *     summary: 关注/取关用户
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
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

/**
 * @openapi
 * /api/users/{id}/influence:
 *   get:
 *     tags: [用户]
 *     summary: 获取用户影响力详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: days
 *         in: query
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/influence', asyncHandler(async (req, res) => {
  const { id: userId } = req.params;
  const { days = 30 } = req.query;
  const result = await calculateInfluence(userId, parseInt(days) || 30);
  success(res, result);
}));

export default router;
