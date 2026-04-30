import { z } from 'zod';

export const createConversationSchema = {
  body: z.object({
    type: z.union([
      z.enum(['private', 'group']).transform(v => v === 'private' ? 1 : 2),
      z.number().int().min(1).max(2)
    ]),
    participantIds: z.array(z.string().min(1)).min(1, '至少需要 1 个参与者'),
  }),
};

export const sendMessageSchema = {
  params: z.object({
    userId: z.string().min(1),
    conversationId: z.string().min(1),
  }),
  body: z.object({
    content: z.string().min(1, '消息不能为空').max(5000),
    contentType: z.number().int().optional().default(1),
  }),
};
