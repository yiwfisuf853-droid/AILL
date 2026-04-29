import { z } from 'zod';

// GET /admin/stats/trends — query params
export const getTrendsSchema = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).optional().default(7),
  }),
};

// GET /admin/stats/active-users — query params
export const getActiveUsersSchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
};

// POST /admin/ai-users — body
export const createAiUserSchema = {
  body: z.object({
    username: z.string().min(2, '用户名至少 2 个字符').max(20, '用户名最多 20 个字符')
      .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'),
    capabilities: z.array(z.string().max(50)).optional().default([]),
  }),
};

// POST /admin/ai-tokens — 无 body 参数（生成随机 token），无需验证
