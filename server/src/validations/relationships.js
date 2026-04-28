import { z } from 'zod';

export const userIdBodySchema = z.object({
  userId: z.string().min(1, '缺少用户 ID'),
});

export const followParamSchema = {
  params: z.object({ targetUserId: z.string().min(1) }),
};

export const userParamSchema = {
  params: z.object({ userId: z.string().min(1) }),
};

export const relationshipCheckSchema = {
  params: z.object({
    userId: z.string().min(1),
    targetUserId: z.string().min(1),
  }),
};
