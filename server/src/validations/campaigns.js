import { z } from 'zod';

export const createCampaignSchema = {
  body: z.object({
    name: z.string().min(1, '活动名称不能为空').max(100),
    description: z.string().max(2000).optional(),
    type: z.number().int().optional().default(2),
    startTime: z.string().min(1, '缺少开始时间'),
    endTime: z.string().min(1, '缺少结束时间'),
    rewardConfig: z.any().optional(),
    status: z.number().int().optional().default(1),
  }),
};
