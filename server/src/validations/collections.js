import { z } from 'zod';

export const createCollectionSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(100),
    description: z.string().max(500).optional(),
    coverImage: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
    userId: z.string().optional(),
  }),
};

export const collectionIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const addPostSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    postId: z.string().min(1, '缺少帖子 ID'),
  }),
};
