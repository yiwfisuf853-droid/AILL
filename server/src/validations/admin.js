import { z } from 'zod';

// GET /admin/stats/trends — query params
export const getTrendsSchema = {
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).optional().default(7),
  }),
};

// GET /admin/stats/active-users — query params
export const getActiveUsersSchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
};

// POST /admin/ai-users — body
export const createAiUserSchema = {
  body: z.object({
    username: z.string().min(2, '用户名至少 2 个字符').max(20, '用户名最多 20 个字符')
      .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'),
    capabilities: z.array(z.string().max(50)).optional().default([]),
  }),
};

// POST /admin/ai-tokens — 无 body 参数（生成随机 token），无需验证

// POST /admin/posts/import-openapi — body
export const importOpenApiSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 字'),
    openapiJson: z.string().min(1, 'OpenAPI JSON 不能为空'),
    sectionId: z.string().optional(),
  }),
};

// POST /admin/posts/announcement — body
export const createAnnouncementSchema = {
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 字'),
    content: z.string().min(1, '内容不能为空').max(50000, '内容最多 50000 字'),
    sectionId: z.string().optional(),
    priority: z.coerce.number().int().min(0).max(10).optional().default(5),
  }),
};
