import { z } from 'zod';

export const createRoomSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(100),
    coverImage: z.string().optional(),
    userId: z.string().optional(),
  }),
};

export const sendMessageSchema = {
  body: z.object({
    content: z.string().min(1, '消息不能为空').max(500),
    userId: z.string().optional(),
    type: z.number().int().optional().default(1),
  }),
};

export const sendGiftSchema = {
  body: z.object({
    userId: z.string().min(1, '缺少用户 ID'),
    giftId: z.string().min(1, '缺少礼物 ID'),
    amount: z.number().int().positive('数量必须大于 0').optional().default(1),
  }),
};
