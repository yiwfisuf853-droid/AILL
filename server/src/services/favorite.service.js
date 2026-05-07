import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';

/**
 * 获取收藏夹列表
 */
export async function getFavoriteFolders(userId) {
  // 如果用户不存在，直接返回空列表（而非 500）
  const userExists = await repo.findById('users', userId);
  if (!userExists) {
    return { total: 0, list: [] };
  }

  const folders = await repo.findAll('favorite_folders', {
    where: { userId },
  });

  // findAll without page/limit returns a plain array
  // 如果用户还没有收藏夹，自动创建一个默认收藏夹（与 seed 数据一致）
  if (!Array.isArray(folders) || folders.length === 0) {
    try {
      const defaultFolder = await repo.insert('favorite_folders', {
        id: generateId(),
        userId,
        name: '我的收藏',
        description: '',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      });
      return { total: 1, list: [{ id: defaultFolder.id, name: defaultFolder.name, itemCount: 0, createdAt: defaultFolder.createdAt }] };
    } catch (err) {
      // 创建失败则返回空
      return { total: 0, list: [] };
    }
  }

  const list = [];
  for (const f of folders) {
    const count = await repo.count('favorites', {
      folderId: f.id,
    });

    list.push({
      id: f.id,
      name: f.name,
      itemCount: count,
      createdAt: f.createdAt,
    });
  }

  return { total: list.length, list };
}

/**
 * 创建收藏夹
 */
export async function createFolder(userId, name) {
  const existing = await repo.findOne('favorite_folders', {
    userId,
    name,
  });
  if (existing) {
    throw new ConflictError('收藏夹名称已存在');
  }

  const folder = await repo.insert('favorite_folders', {
    id: generateId(),
    userId,
    name,
    createdAt: new Date().toISOString(),
  });

  return { success: true, folder };
}

/**
 * 获取收藏列表
 */
export async function getFavorites(userId, options = {}) {
  const { folderId, page = 1, limit = 20 } = options;

  // 如果用户不存在，直接返回空结果（而非 500）
  const userExists = await repo.findById('users', userId);
  if (!userExists) {
    return { total: 0, page, limit, hasMore: false, list: [] };
  }

  const where = { userId };
  if (folderId !== undefined) {
    where.folderId = folderId;
  }

  const result = await repo.findAll('favorites', {
    where,
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  const list = [];
  for (const f of result.list) {
    let targetData = null;

    if (f.targetType === 1) {
      const post = await repo.findById('posts', f.targetId);
      if (post && !post.deletedAt) {
        targetData = {
          type: 'post',
          id: post.id,
          title: post.title,
          coverImage: post.coverImage,
          authorId: post.authorId,
        };
      }
    } else if (f.targetType === 2) {
      const collection = await repo.findById('collections', f.targetId);
      if (collection && !collection.deletedAt) {
        targetData = {
          type: 'collection',
          id: collection.id,
          name: collection.title,
          description: collection.description,
          coverImage: collection.coverImage,
        };
      }
    } else if (f.targetType === 3) {
      const user = await repo.findById('users', f.targetId);
      if (user && !user.deletedAt) {
        targetData = {
          type: 'user',
          id: user.id,
          username: user.username,
          nickname: user.username,
          avatar: user.avatar,
        };
      }
    }

    list.push({
      id: f.id,
      targetType: f.targetType,
      targetTypeName: getTargetTypeName(f.targetType),
      targetId: f.targetId,
      target: targetData,
      folderId: f.folderId,
      createdAt: f.createdAt,
    });
  }

  return {
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: page * limit < result.total,
    list,
  };
}

/**
 * 添加到收藏
 */
export async function addToFavorites(userId, targetType, targetId, folderId = null) {
  const existing = await repo.findOne('favorites', {
    userId,
    targetType,
    targetId,
  });
  if (existing) {
    throw new ConflictError('已收藏该项目');
  }

  // 如果指定了文件夹，检查文件夹是否存在
  if (folderId) {
    const folder = await repo.findById('favorite_folders', folderId);
    if (!folder || folder.userId !== userId) {
      throw new NotFoundError('收藏夹不存在');
    }
  }

  const favorite = await repo.insert('favorites', {
    id: generateId(),
    userId,
    folderId,
    targetType,
    targetId,
    createdAt: new Date().toISOString(),
  });

  return { success: true, favorite };
}

/**
 * 取消收藏
 */
export async function removeFromFavorites(userId, targetType, targetId) {
  const existing = await repo.findOne('favorites', {
    userId,
    targetType,
    targetId,
  });
  if (!existing) {
    throw new NotFoundError('未收藏该项目');
  }

  await repo.remove('favorites', existing.id);

  return { success: true };
}

function getTargetTypeName(type) {
  const names = {
    1: '帖子',
    2: '合集',
    3: '用户',
  };
  return names[type] || '未知';
}