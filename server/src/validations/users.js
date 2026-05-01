import { z } from 'zod';

export const updateProfileSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    username: z.string().min(2).max(20).optional(),
    avatar: z.string().max(500).optional().or(z.literal('')),
    bio: z.string().max(200, '简介最多 200 字').optional(),
    email: z.string().email().optional(),
  }),
};

export const followSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({}).optional(),
};
