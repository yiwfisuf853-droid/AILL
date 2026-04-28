import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';

/**
 * 获取字典类型列表
 */
export async function getDictTypes() {
  const types = await repo.findAll('dict_types', {});

  const list = [];
  for (const t of types) {
    const itemCount = await repo.count('dict_items', {
      dictTypeId: t.id,
      status: 1,
    });

    list.push({
      id: t.id,
      typeCode: t.typeCode,
      typeName: t.typeName,
      description: t.description,
      itemCount,
      createdAt: t.createdAt,
    });
  }

  return { total: list.length, list };
}

/**
 * 创建字典类型
 */
export async function createDictType(data) {
  const existing = await repo.findOne('dict_types', {
    typeCode: data.typeCode,
  });
  if (existing) {
    throw new ConflictError('字典类型编码已存在');
  }

  // dict_types.id 是 int PRIMARY KEY，使用自增序列
  const maxResult = await repo.rawQuery('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM dict_types');
  const nextId = Number(maxResult.rows[0].next_id);

  const type = await repo.insert('dict_types', {
    id: nextId,
    typeCode: data.typeCode,
    typeName: data.typeName,
    description: data.description || '',
    createdAt: new Date().toISOString(),
  });

  return { success: true, type };
}

/**
 * 获取字典项列表
 */
export async function getDictItems(dictTypeId) {
  const items = await repo.findAll('dict_items', {
    where: { dictTypeId, status: 1 },
    orderBy: 'sort_order ASC',
  });

  const list = items.map(i => ({
    id: i.id,
    dictTypeId: i.dictTypeId,
    itemKey: i.itemKey,
    itemValue: i.itemValue,
    extra: i.extra ? (typeof i.extra === 'string' ? JSON.parse(i.extra) : i.extra) : null,
    sortOrder: i.sortOrder,
    isDefault: i.isDefault,
    status: i.status,
  }));

  return { total: list.length, list };
}

/**
 * 创建字典项
 */
export async function createDictItem(dictTypeId, data) {
  const existing = await repo.findOne('dict_items', {
    dictTypeId,
    itemKey: data.itemKey,
  });
  if (existing) {
    throw new ConflictError('字典项 Key 已存在');
  }

  // dict_items.id 是 int PRIMARY KEY，使用自增序列
  const maxResult = await repo.rawQuery('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM dict_items');
  const nextId = Number(maxResult.rows[0].next_id);

  const item = await repo.insert('dict_items', {
    id: nextId,
    dictTypeId,
    itemKey: data.itemKey,
    itemValue: data.itemValue,
    extra: data.extra ? JSON.stringify(data.extra) : null,
    sortOrder: data.sortOrder || 0,
    isDefault: data.isDefault || false,
    status: 1,
    createdAt: new Date().toISOString(),
  });

  return { success: true, item };
}

/**
 * 更新字典项
 */
export async function updateDictItem(id, data) {
  const item = await repo.findById('dict_items', id);
  if (!item) {
    throw new NotFoundError('字典项不存在');
  }

  const updateData = {};
  if (data.itemValue !== undefined) {
    updateData.itemValue = data.itemValue;
  }
  if (data.extra !== undefined) {
    updateData.extra = data.extra ? JSON.stringify(data.extra) : null;
  }
  if (data.sortOrder !== undefined) {
    updateData.sortOrder = data.sortOrder;
  }
  if (data.isDefault !== undefined) {
    updateData.isDefault = data.isDefault;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  const updated = await repo.update('dict_items', id, updateData);

  return { success: true, item: updated };
}
