import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';

/**
 * 获取用户资产列表
 */
export async function getAssets(userId) {
  const assetTypes = await repo.findAll('asset_types', { orderBy: 'id ASC' });
  for (const type of assetTypes) {
    const existing = await repo.findOne('user_assets', { userId, assetTypeId: type.id });
    if (!existing) {
      await repo.insert('user_assets', {
        id: generateId(),
        userId,
        typeId: type.id,
        assetTypeId: type.id,
        balance: 0,
        frozen: 0,
        updatedAt: new Date().toISOString(),
        expiredAt: null,
      });
    }
  }
  const userAssets = await repo.findAll('user_assets', { where: { userId }, orderBy: 'type_id ASC' });
  const list = userAssets.map(a => {
    const type = assetTypes.find(t => t.id === a.assetTypeId);
    return { ...a, assetType: type };
  });
  return { total: list.length, list };
}

/**
 * 获取资产流水
 */
export async function getAssetTransactions(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const result = await repo.findAll('asset_transactions', {
    where: { userId },
    page,
    limit,
    orderBy: 'created_at DESC',
  });
  const assetTypes = await repo.findAll('asset_types', { orderBy: 'id ASC' });
  const list = result.list.map(t => {
    const type = assetTypes.find(a => a.id === t.assetTypeId);
    return { ...t, assetTypeName: type?.name };
  });
  return { total: result.total, page, limit, hasMore: page * limit < result.total, list };
}

/**
 * 增加资产
 */
export async function addAsset(userId, assetTypeId, amount, description = '', relatedBizId = '') {
  const assetType = await repo.findById('asset_types', assetTypeId);
  if (!assetType) throw new NotFoundError('资产类型不存在');
  if (amount <= 0) throw new ValidationError('增加数量必须大于 0');

  let userAsset = await repo.findOne('user_assets', { userId, assetTypeId });
  if (!userAsset) {
    userAsset = await repo.insert('user_assets', {
      id: generateId(),
      userId,
      typeId: assetTypeId,
      assetTypeId,
      balance: 0,
      frozen: 0,
      updatedAt: new Date().toISOString(),
      expiredAt: null,
    });
  }

  const newBalance = (userAsset.balance || 0) + amount;
  await repo.update('user_assets', userAsset.id, { balance: newBalance, updatedAt: new Date().toISOString() });

  const transaction = await repo.insert('asset_transactions', {
    id: generateId(),
    userId,
    typeId: assetTypeId,
    assetTypeId,
    type: 1,
    transactionType: 1,
    amount,
    balance: userAsset.balance || 0,
    balanceAfter: newBalance,
    frozenAfter: userAsset.frozen,
    relatedBizId,
    description: description || `${assetType.name}收入`,
    status: 1,
    createdAt: new Date().toISOString(),
  });

  await repo.insert('user_contributions', {
    id: generateId(),
    userId,
    type: 4,
    contributionType: 4,
    sourceId: relatedBizId || null,
    score: Math.floor(amount / 10),
    createdAt: new Date().toISOString(),
  });

  return { success: true, transaction, balance: newBalance };
}

/**
 * 消耗资产
 */
export async function consumeAsset(userId, assetTypeId, amount, description = '', relatedBizId = '') {
  const assetType = await repo.findById('asset_types', assetTypeId);
  if (!assetType) throw new NotFoundError('资产类型不存在');
  if (amount <= 0) throw new ValidationError('消耗数量必须大于 0');

  const userAsset = await repo.findOne('user_assets', { userId, assetTypeId });
  if (!userAsset) throw new ForbiddenError(`用户${assetType.name}不足`);
  if (userAsset.balance < amount) throw new ForbiddenError(`${assetType.name}不足`);

  const newBalance = userAsset.balance - amount;
  await repo.update('user_assets', userAsset.id, { balance: newBalance, updatedAt: new Date().toISOString() });

  const transaction = await repo.insert('asset_transactions', {
    id: generateId(),
    userId,
    typeId: assetTypeId,
    assetTypeId,
    type: 2,
    transactionType: 2,
    amount,
    balance: userAsset.balance,
    balanceAfter: newBalance,
    frozenAfter: userAsset.frozen,
    relatedBizId,
    description: description || `${assetType.name}支出`,
    status: 1,
    createdAt: new Date().toISOString(),
  });

  return { success: true, transaction, balance: newBalance };
}

/**
 * 获取资产类型列表
 */
export async function getAssetTypes() {
  return await repo.findAll('asset_types');
}