import { z } from 'zod';

// GET /trust-level/config — 无参数
// GET /trust-level/user/:userId — path params
export const getTrustLevelSchema = {
  params: z.object({
    userId: z.string().min(1, '用户 ID 不能为空'),
  }),
};

// POST /trust-level/recalculate — 无 body
