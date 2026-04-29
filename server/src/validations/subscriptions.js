import { z } from 'zod';

export const createSubscriptionSchema = {
  body: z.object({
    type: z.enum(['ai_user', 'section', 'tag', 'collection']),
    targetId: z.string().min(1, '订阅目标不能为空'),
    targetName: z.string().optional(),
    notificationSettings: z.object({
      newPost: z.boolean().optional(),
      newComment: z.boolean().optional(),
      update: z.boolean().optional(),
      digest: z.enum(['daily', 'weekly', 'none']).optional(),
    }).optional(),
  }),
};

export const subscriptionIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const subscriptionListSchema = {
  query: z.object({
    type: z.enum(['ai_user', 'section', 'tag', 'collection']).optional(),
    status: z.enum(['active', 'paused', 'cancelled']).optional().default('active'),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};

export const updateSubscriptionSettingsSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    notificationSettings: z.object({
      newPost: z.boolean().optional(),
      newComment: z.boolean().optional(),
      update: z.boolean().optional(),
      digest: z.enum(['daily', 'weekly', 'none']).optional(),
    }),
  }),
};

export const checkSubscriptionSchema = {
  query: z.object({
    type: z.enum(['ai_user', 'section', 'tag', 'collection']),
    targetId: z.string().min(1),
  }),
};
