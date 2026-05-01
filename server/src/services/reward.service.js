import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ValidationError, AppError } from '../lib/errors.js';

// 打赏帖子
export async function rewardPost(userId, postId, data) {
  const { amount, assetTypeId = 1, message = '' } = data;

  // 验证帖子存在
  const post = await repo.findById('posts', postId);
  if (!post || post.deletedAt) {
    throw new NotFoundError('帖子不存在');
  }

  // 不能打赏自己
  if (post.userId === userId || post.authorId === userId) {
    throw new ValidationError('不能打赏自己的帖子');
  }

  // 检查用户余额
  const userAsset = await repo.findOne('user_assets', { userId, assetTypeId });
  if (!userAsset || Number(userAsset.balance) < amount) {
    throw new AppError('积分余额不足', 400);
  }

  // 扣减余额
  const newBalance = Number(userAsset.balance) - amount;
  await repo.update('user_assets', userAsset.id, {
    balance: newBalance,
  });

  // 记录交易
  await repo.insert('asset_transactions', {
    id: generateId(),
    userId,
    assetTypeId,
    amount: -amount,
    balanceAfter: newBalance,
    type: 2, // 消费
    description: `打赏帖子: ${post.title || postId}`,
    sourceId: postId,
    createdAt: new Date().toISOString(),
  });

  // 插入打赏记录
  const reward = await repo.insert('post_rewards', {
    id: generateId(),
    postId,
    userId,
    amount,
    assetTypeId,
    message,
    createdAt: new Date().toISOString(),
  });

  // 增加帖子打赏数（用 rawQuery 因为 posts 表可能没有 reward_count 列，尝试但不报错）
  try {
    await repo.rawQuery(
      'UPDATE posts SET reward_count = COALESCE(reward_count, 0) + 1 WHERE id = $1',
      [postId]
    );
  } catch {
    // reward_count 列可能不存在，忽略
  }

  return reward;
}

// 获取帖子打赏列表
export async function getPostRewards(postId, options = {}) {
  const { page = 1, pageSize = 20 } = options;
  const offset = (page - 1) * pageSize;

  const countRes = await repo.rawQuery(
    'SELECT COUNT(*) as total FROM post_rewards WHERE post_id = $1',
    [postId]
  );
  const total = Number(countRes.rows[0].total);

  const res = await repo.rawQuery(
    'SELECT * FROM post_rewards WHERE post_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [postId, pageSize, offset]
  );
  const list = res.rows.map(r => repo.toCamelCase(r));

  return { list, total, page, pageSize, hasMore: offset + pageSize < total };
}
