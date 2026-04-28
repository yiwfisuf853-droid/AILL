import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError, AppError } from '../lib/errors.js';

// ========== 活动/任务 ==========

/**
 * 获取活动列表
 */
export async function getCampaigns(options = {}) {
  const { type, status = 1, page = 1, limit = 20 } = options;

  const where = {};
  if (status !== undefined) where.status = Number(status);
  if (type) where.type = Number(type);
  return await repo.findAll('campaigns', { where, page, limit, orderBy: 'created_at DESC' });
}

/**
 * 获取活动详情
 */
export async function getCampaignDetail(id) {
  const campaign = await repo.findById('campaigns', id);
  if (!campaign) throw new NotFoundError('活动不存在');
  return campaign;
}

/**
 * 创建活动
 */
export async function createCampaign(data) {
  if (!data.name) throw new ValidationError('缺少活动名称');
  if (!data.startTime) throw new ValidationError('缺少开始时间');
  if (!data.endTime) throw new ValidationError('缺少结束时间');

  const item = {
    id: generateId(),
    name: data.name,
    description: data.description || '',
    type: data.type || 2, // 1活动 2任务
    startTime: data.startTime,
    endTime: data.endTime,
    rewardConfig: data.rewardConfig || {},
    status: data.status !== undefined ? data.status : 1,
    createdAt: new Date().toISOString(),
  };

  const result = await repo.insert('campaigns', item);
  return { success: true, item: result };
}

/**
 * 更新活动
 */
export async function updateCampaign(id, data) {
  const existing = await repo.findById('campaigns', id);
  if (!existing) throw new NotFoundError('活动不存在');

  const updateData = {};
  const fields = ['name', 'description', 'type', 'startTime', 'endTime', 'rewardConfig', 'status'];
  fields.forEach(f => {
    if (data[f] !== undefined) updateData[f] = data[f];
  });

  const result = await repo.update('campaigns', id, updateData);
  return { success: true, item: result };
}

/**
 * 删除活动
 */
export async function deleteCampaign(id) {
  const existing = await repo.findById('campaigns', id);
  if (!existing) throw new NotFoundError('活动不存在');
  await repo.remove('campaigns', id);
  return { success: true };
}

// ========== 用户参与进度 ==========

/**
 * 获取用户活动进度
 */
export async function getUserCampaignProgress(userId, options = {}) {
  const { campaignId, page = 1, limit = 20 } = options;

  const where = { userId };
  if (campaignId) where.campaignId = campaignId;
  const result = await repo.findAll('user_campaign_progress', { where, page, limit, orderBy: 'joined_at DESC' });

  // 关联活动信息
  const list = await Promise.all(result.list.map(async (p) => {
    const campaign = await repo.findById('campaigns', p.campaignId);
    return { ...p, campaign: campaign || null };
  }));

  return { ...result, list };
}

/**
 * 参与活动
 */
export async function joinCampaign(userId, campaignId) {
  const campaign = await repo.findOne('campaigns', { id: campaignId, status: 1 });
  if (!campaign) throw new NotFoundError('活动不存在或已结束');

  const now = new Date().toISOString();
  if (campaign.startTime > now) throw new AppError('活动尚未开始', 400);
  if (campaign.endTime < now) throw new AppError('活动已结束', 400);

  const existing = await repo.findOne('user_campaign_progress', { userId, campaignId });
  if (existing) throw new ConflictError('已参与该活动');

  const item = {
    id: generateId(),
    userId,
    campaignId,
    currentCount: 0,
    completed: false,
    completedAt: null,
    joinedAt: new Date().toISOString(),
  };

  const result = await repo.insert('user_campaign_progress', item);
  return { success: true, item: result };
}

/**
 * 更新活动进度
 */
export async function updateCampaignProgress(userId, campaignId, increment = 1) {
  const item = await repo.findOne('user_campaign_progress', { userId, campaignId });
  if (!item) throw new NotFoundError('未参与该活动');

  if (item.completed) return { success: true, item, alreadyCompleted: true };

  const campaign = await repo.findById('campaigns', campaignId);
  const target = campaign?.rewardConfig?.target || 1;
  const newCount = Math.min((item.currentCount || 0) + increment, target);
  const updateData = { currentCount: newCount };

  if (newCount >= target) {
    updateData.completed = true;
    updateData.completedAt = new Date().toISOString();

    // 发放奖励
    if (campaign && campaign.rewardConfig) {
      const { addAsset } = await import('./asset.service.js');
      const rewards = campaign.rewardConfig.rewards || [];
      for (const reward of rewards) {
        if (reward.assetTypeId && reward.amount) {
          await addAsset(userId, reward.assetTypeId, reward.amount, `完成任务: ${campaign.name}`, campaignId);
        }
      }
    }
  }

  const result = await repo.update('user_campaign_progress', item.id, updateData);
  return { success: true, item: result };
}

// ========== 成就 ==========

/**
 * 获取成就列表
 */
export async function getAchievements(options = {}) {
  const { page = 1, limit = 20 } = options;

  return await repo.findAll('achievements', { page, limit, orderBy: 'created_at DESC' });
}

/**
 * 创建成就
 */
export async function createAchievement(data) {
  if (!data.name) throw new ValidationError('缺少成就名称');
  if (!data.condition) throw new ValidationError('缺少解锁条件');

  const item = {
    id: generateId(),
    name: data.name,
    icon: data.icon || '',
    condition: data.condition,
    reward: data.reward || {},
    createdAt: new Date().toISOString(),
  };

  const result = await repo.insert('achievements', item);
  return { success: true, item: result };
}

/**
 * 获取用户成就
 */
export async function getUserAchievements(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const result = await repo.findAll('user_achievements', { where: { userId }, page, limit, orderBy: 'unlocked_at DESC' });

  const list = await Promise.all(result.list.map(async (ua) => {
    const achievement = await repo.findById('achievements', ua.achievementId);
    return { ...ua, achievement: achievement || null };
  }));

  return { ...result, list };
}

/**
 * 解锁成就
 */
export async function unlockAchievement(userId, achievementId) {
  const achievement = await repo.findById('achievements', achievementId);
  if (!achievement) throw new NotFoundError('成就不存在');

  const existing = await repo.findOne('user_achievements', { userId, achievementId });
  if (existing) throw new ConflictError('已解锁该成就');

  const item = {
    id: generateId(),
    userId,
    achievementId,
    unlockedAt: new Date().toISOString(),
  };

  const result = await repo.insert('user_achievements', item);

  // 发放成就奖励
  if (achievement.reward) {
    const { addAsset } = await import('./asset.service.js');
    const rewards = achievement.reward.rewards || [];
    for (const reward of rewards) {
      if (reward.assetTypeId && reward.amount) {
        await addAsset(userId, reward.assetTypeId, reward.amount, `成就奖励: ${achievement.name}`, achievementId);
      }
    }
  }

  return { success: true, item: result };
}
