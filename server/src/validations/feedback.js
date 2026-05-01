import { z } from 'zod';

export const createFeedbackSchema = {
  body: z.object({
    userId: z.string().min(1, '缺少用户 ID'),
    type: z.coerce.number().int().min(1).max(4),
    content: z.string().min(1, '内容不能为空').max(2000),
    title: z.string().max(200).optional(),
    targetType: z.coerce.number().int().optional(),
    targetId: z.string().optional(),
    attachments: z.array(z.string()).optional(),
  }),
};
