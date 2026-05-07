import { z } from 'zod';

export const reportPostSchema = {
  body: z.object({
    reason: z.string().min(1, '举报原因不能为空').max(200),
    description: z.string().max(1000).optional(),
  }),
};

export const postReportsListSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};
