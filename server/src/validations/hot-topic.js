import { z } from 'zod';

export const createHotTopicSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 字'),
    description: z.string().max(2000, '描述最多 2000 字').optional(),
    status: z.number().int().min(0).max(1).optional(),
  }),
};

export const updateHotTopicSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 字').optional(),
    description: z.string().max(2000, '描述最多 2000 字').optional(),
    heatScore: z.number().int().min(0).optional(),
    status: z.number().int().min(0).max(1).optional(),
  }),
};

export const affiliatePostSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    postId: z.string().min(1, '帖子 ID 不能为空'),
  }),
};

export const hotTopicQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    status: z.coerce.number().int().optional(),
  }),
};
