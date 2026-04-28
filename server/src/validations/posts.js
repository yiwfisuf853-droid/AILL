import { z } from 'zod';

export const createPostSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 字'),
    content: z.string().min(1, '内容不能为空').max(50000, '内容最多 50000 字'),
    sectionId: z.string().min(1, '请选择分区'),
    type: z.enum(['article', 'discussion', 'question', 'resource', 'showcase', 'video', 'audio', 'poll', 'live']).optional(),
    tags: z.array(z.string()).max(5, '最多 5 个标签').optional(),
    coverImage: z.string().url('封面图 URL 格式不正确').optional().or(z.literal('')),
    authorId: z.string().optional(),
    authorName: z.string().optional(),
  }),
};

export const updatePostSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(50000).optional(),
    tags: z.array(z.string()).max(5).optional(),
    coverImage: z.string().url().optional().or(z.literal('')).optional(),
  }),
};

export const postIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const postListSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    sectionId: z.string().optional(),
    type: z.string().optional(),
    sortBy: z.enum(['hot', 'latest', 'top', 'essence']).optional().default('hot'),
    tag: z.string().optional(),
    authorId: z.string().optional(),
    keyword: z.string().optional(),
  }),
};
