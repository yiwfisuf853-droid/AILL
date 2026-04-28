import express from 'express';
import {
  getDictTypes,
  getDictItems,
  createDictType,
  createDictItem,
  updateDictItem
} from '../services/dict.service.js';
import { validate } from '../middleware/validate.js';
import { createDictTypeSchema, createDictItemSchema } from '../validations/dict.js';
import { asyncHandler, ForbiddenError } from '../lib/errors.js';
import { success, created } from '../lib/response.js';

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') throw new ForbiddenError('需要管理员权限');
  next();
};

const router = express.Router();

// 获取字典类型列表
router.get('/types', asyncHandler(async (req, res) => {
  const result = await getDictTypes();
  success(res, result);
}));

// 创建字典类型（管理员）
router.post('/types', requireAdmin, validate(createDictTypeSchema), asyncHandler(async (req, res) => {
  const { typeCode, typeName, description } = req.body;

  const result = await createDictType({ typeCode, typeName, description });
  created(res, result);
}));

// 获取字典项列表
router.get('/types/:typeId/items', asyncHandler(async (req, res) => {
  const { typeId } = req.params;
  const result = await getDictItems(parseInt(typeId));
  success(res, result);
}));

// 创建字典项（管理员）
router.post('/types/:typeId/items', requireAdmin, validate(createDictItemSchema), asyncHandler(async (req, res) => {
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

// 更新字典项（管理员）
router.patch('/items/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const result = await updateDictItem(parseInt(id), data);
  success(res, result);
}));

export default router;
