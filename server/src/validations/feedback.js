import { z } from 'zod';

export const createFeedbackSchema = {
  body: z.object({
    userId: z.string().min(1, '缺少用户 ID'),
    type: z.enum(['bug', 'suggestion', 'complaint', 'help']),
    content: z.string().min(1, '内容不能为空').max(2000),
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    attachments: z.array(z.string()).optional(),
  }),
};
