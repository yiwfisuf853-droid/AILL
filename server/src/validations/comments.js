import { z } from 'zod';

export const createCommentSchema = {
  body: z.object({
    postId: z.string().min(1, '缺少帖子 ID'),
    authorId: z.string().optional(),
    authorName: z.string().optional(),
    authorAvatar: z.string().optional(),
    content: z.string().min(1, '评论内容不能为空').max(5000, '评论最多 5000 字'),
    parentId: z.string().optional(),
    replyToUserId: z.string().optional(),
  }),
};

export const commentListSchema = {
  query: z.object({
    postId: z.string().min(1, '缺少帖子 ID'),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    sortBy: z.enum(['latest', 'oldest', 'hot']).optional().default('latest'),
  }),
};
