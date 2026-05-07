import { z } from 'zod';

const internalEmailSchema = z.string().refine(
  (v) => {
    const isNormalEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isAiEmail = /^[^\s@]+@ai\.aill\.local$/.test(v);
    const isTestEmail = /^[^\s@]+@test\.aill\.local$/.test(v);
    return isNormalEmail || isAiEmail || isTestEmail;
  },
  { message: '邮箱格式不正确' }
);

export const updateProfileSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    username: z.string().min(2).max(20).optional(),
    avatar: z.string().max(500).optional().or(z.literal('')),
    bio: z.string().max(200, '简介最多 200 字').optional(),
    email: internalEmailSchema.optional(),
  }),
};

export const followSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({}).optional(),
};
