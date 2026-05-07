import express from 'express';
import { createPoll, getPollDetail, votePoll, cancelVote, getPostPoll, deletePoll } from '../services/poll.service.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { authMiddleware, optionalAuthMiddleware } from '../services/auth.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createPollSchema, votePollSchema, pollIdSchema, postIdForPollSchema } from '../validations/polls.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

/**
 * @openapi
 * /api/polls:
 *   post:
 *     tags: [投票]
 *     summary: 创建投票
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, options]
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               description: { type: string }
 *               postId: { type: string }
 *               pollType: { type: string, enum: [single, multi] }
 *               isAnonymous: { type: boolean }
 *               endedAt: { type: string, format: date-time }
 *               options:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         text: { type: string }
 *     responses:
 *       201: { description: 创建成功 }
 */
router.post(
  '/',
  authMiddleware,
  validateRequest(createPollSchema),
  asyncHandler(async (req, res) => {
    const poll = await createPoll(req.user.id, req.body);
    created(res, poll);
  })
);

/**
 * @openapi
 * /api/polls/{pollId}:
 *   get:
 *     tags: [投票]
 *     summary: 获取投票详情
 *     parameters:
 *       - name: pollId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 投票详情 }
 */
router.get(
  '/:pollId',
  optionalAuthMiddleware,
  validateRequest(pollIdSchema),
  asyncHandler(async (req, res) => {
    const poll = await getPollDetail(req.params.pollId, req.user?.id);
    success(res, poll);
  })
);

/**
 * @openapi
 * /api/polls/{pollId}/vote:
 *   post:
 *     tags: [投票]
 *     summary: 投票
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: pollId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [optionIds]
 *             properties:
 *               optionIds:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items: { type: string }
 *     responses:
 *       200: { description: 投票成功 }
 */
router.post(
  '/:pollId/vote',
  authMiddleware,
  validateRequest(votePollSchema),
  asyncHandler(async (req, res) => {
    const poll = await votePoll(req.params.pollId, req.user.id, req.body.optionIds);
    success(res, poll);
  })
);

/**
 * @openapi
 * /api/polls/{pollId}/cancel:
 *   post:
 *     tags: [投票]
 *     summary: 取消投票
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: pollId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 取消成功 }
 */
router.post(
  '/:pollId/cancel',
  authMiddleware,
  validateRequest(pollIdSchema),
  asyncHandler(async (req, res) => {
    const poll = await cancelVote(req.params.pollId, req.user.id);
    success(res, poll);
  })
);

/**
 * @openapi
 * /api/polls/post/{postId}:
 *   get:
 *     tags: [投票]
 *     summary: 获取帖子关联的投票
 *     parameters:
 *       - name: postId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 投票详情或 null }
 */
router.get(
  '/post/:postId',
  optionalAuthMiddleware,
  validateRequest(postIdForPollSchema),
  asyncHandler(async (req, res) => {
    const poll = await getPostPoll(req.params.postId, req.user?.id);
    success(res, poll);
  })
);

/**
 * @openapi
 * /api/polls/{pollId}:
 *   delete:
 *     tags: [投票]
 *     summary: 删除投票（仅创建者或管理员）
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: pollId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 删除成功 }
 */
router.delete(
  '/:pollId',
  authMiddleware,
  validateRequest(pollIdSchema),
  asyncHandler(async (req, res) => {
    const result = await deletePoll(req.params.pollId, req.user.id, req.user.role);
    deleted(res, result);
  })
);

export default router;
