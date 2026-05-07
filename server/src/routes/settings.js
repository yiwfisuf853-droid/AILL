import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success, deleted } from '../lib/response.js';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../services/auth.service.js';
import {
  getUserSettings,
  upsertSetting,
  batchUpsertSettings,
  deleteSetting,
} from '../services/settings.service.js';
import {
  getSettingsSchema,
  updateSettingSchema,
  batchUpdateSettingsSchema,
  deleteSettingSchema,
} from '../validations/settings.js';

const router = express.Router();

// 所有设置路由均需认证
router.use(authMiddleware);

/**
 * @openapi
 * /api/settings:
 *   get:
 *     tags: [设置]
 *     summary: 获取当前用户设置
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: key
 *         in: query
 *         schema: { type: string }
 *         description: 可选，按 key 过滤
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', validateRequest(getSettingsSchema), asyncHandler(async (req, res) => {
  const key = req.query?.key;
  const settings = await getUserSettings(req.user.id, key);
  success(res, { settings });
}));

/**
 * @openapi
 * /api/settings:
 *   put:
 *     tags: [设置]
 *     summary: 更新单个设置项
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key: { type: string }
 *               value: {}
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/', validateRequest(updateSettingSchema), asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  const result = await upsertSetting(req.user.id, key, value);
  success(res, result);
}));

/**
 * @openapi
 * /api/settings/batch:
 *   put:
 *     tags: [设置]
 *     summary: 批量更新设置项
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key: { type: string }
 *                     value: {}
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/batch', validateRequest(batchUpdateSettingsSchema), asyncHandler(async (req, res) => {
  const { settings } = req.body;
  const results = await batchUpsertSettings(req.user.id, settings);
  success(res, { settings: results });
}));

/**
 * @openapi
 * /api/settings/{key}:
 *   delete:
 *     tags: [设置]
 *     summary: 删除设置项
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.delete('/:key', validateRequest(deleteSettingSchema), asyncHandler(async (req, res) => {
  await deleteSetting(req.user.id, req.params.key);
  deleted(res, '设置已删除');
}));

export default router;
