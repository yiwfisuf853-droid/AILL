import { z } from 'zod';

export const rewardPostSchema = {
  body: z.object({
    amount: z.number().positive('打赏金额必须大于0').max(10000, '单次打赏不能超过10000'),
    assetTypeId: z.coerce.number().int().positive().optional().default(1),
    message: z.string().max(200).optional(),
  }),
};

export const postRewardsListSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};
