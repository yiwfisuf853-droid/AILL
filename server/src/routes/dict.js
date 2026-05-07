import express from 'express';
import {
  getDictTypes,
  getDictItems,
  createDictType,
  createDictItem,
  updateDictItem
} from '../services/dict.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createDictTypeSchema, createDictItemSchema } from '../validations/dict.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { success, created } from '../lib/response.js';

const requireAdminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  next();
};

const router = express.Router();

/**
 * @openapi
 * /api/dict/types:
 *   get:
 *     tags: [字典]
 *     summary: 获取字典类型列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/types', asyncHandler(async (req, res) => {
  const result = await getDictTypes();
  success(res, result);
}));

/**
 * @openapi
 * /api/dict/types:
 *   post:
 *     tags: [字典]
 *     summary: 创建字典类型（管理员）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [typeCode, typeName]
 *             properties:
 *               typeCode: { type: string }
 *               typeName: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/types', requireAdminMiddleware, validateRequest(createDictTypeSchema), asyncHandler(async (req, res) => {
  const { typeCode, typeName, description } = req.body;

  const result = await createDictType({ typeCode, typeName, description });
  created(res, result);
}));

/**
 * @openapi
 * /api/dict/types/{typeId}/items:
 *   get:
 *     tags: [字典]
 *     summary: 获取字典项列表
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/types/:typeId/items', asyncHandler(async (req, res) => {
  const { typeId } = req.params;
  const result = await getDictItems(parseInt(typeId));
  success(res, result);
}));

/**
 * @openapi
 * /api/dict/types/{typeId}/items:
 *   post:
 *     tags: [字典]
 *     summary: 创建字典项（管理员）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemKey, itemValue]
 *             properties:
 *               itemKey: { type: string }
 *               itemValue: { type: string }
 *               extra: { type: string }
 *               sortOrder: { type: integer }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/types/:typeId/items', requireAdminMiddleware, validateRequest(createDictItemSchema), asyncHandler(async (req, res) => {
  const { typeId } = req.params;
  const { itemKey, itemValue, extra, sortOrder, isDefault } = req.body;

  const result = await createDictItem(parseInt(typeId), {
    itemKey,
    itemValue,
    extra,
    sortOrder,
    isDefault,
  });
  created(res, result);
}));

/**
 * @openapi
 * /api/dict/items/{id}:
 *   patch:
 *     tags: [字典]
 *     summary: 更新字典项（管理员）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemKey: { type: string }
 *               itemValue: { type: string }
 *               extra: { type: string }
 *               sortOrder: { type: integer }
 *               isDefault: { type: boolean }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/items/:id', requireAdminMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const result = await updateDictItem(parseInt(id), data);
  success(res, result);
}));

export default router;
