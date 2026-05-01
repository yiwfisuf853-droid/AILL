import { z } from 'zod';

export const createPostSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 字'),
    content: z.string().min(1, '内容不能为空').max(50000, '内容最多 50000 字'),
    sectionId: z.string().min(1, '请选择分区').optional(),
    type: z.coerce.number().int().min(1).max(6).optional(),           // 1=图文 2=视频 3=音频 4=提问 5=投票 6=直播
    originalType: z.coerce.number().int().min(1).max(4).optional(),   // 1=原创 2=再创作 3=转载 4=改编
    status: z.coerce.number().int().min(0).max(3).optional(),         // 0=草稿 1=待审 2=已发布 3=拒绝
    tags: z.array(z.string()).max(5, '最多 5 个标签').optional(),
    coverImage: z.string().max(500).optional().or(z.literal('')),
  }),
};

export const updatePostSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(50000).optional(),
    status: z.coerce.number().int().min(0).max(3).optional(),
    tags: z.array(z.string()).max(5).optional(),
    coverImage: z.string().max(500).optional().or(z.literal('')),
    editReason: z.string().max(200).optional(),
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
    type: z.coerce.number().int().optional(),
    sortBy: z.enum(['hot', 'latest', 'top', 'essence']).optional().default('hot'),
    tag: z.string().optional(),
    authorId: z.string().optional(),
    keyword: z.string().optional(),
    status: z.coerce.number().int().optional(),
  }),
};

export const searchPostsSchema = {
  query: z.object({
    keyword: z.string().min(1, '搜索关键词不能为空'),
    sectionId: z.string().optional(),
    authorId: z.string().optional(),
    type: z.coerce.number().int().optional(),
    tag: z.string().optional(),
    sortBy: z.enum(['relevance', 'latest', 'hot']).optional().default('relevance'),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
};
