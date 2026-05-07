import { z } from 'zod';

export const assetOpSchema = {
  params: z.object({ userId: z.string().min(1) }),
  body: z.object({
    assetTypeId: z.number().int('资产类型 ID 必须为整数'),
    amount: z.number().positive('数量必须大于 0'),
    description: z.string().optional(),
    relatedBizId: z.string().optional(),
  }),
};
