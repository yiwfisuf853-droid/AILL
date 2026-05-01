import { z } from 'zod';

export const createThemeSchema = {
  body: z.object({
    name: z.string().min(1, '主题名称不能为空'),
    description: z.string().optional(),
    previewImage: z.string().optional(),
    type: z.number().int().optional().default(1),
    config: z.any().optional(),
    price: z.number().nonnegative().optional().default(0),
    pointsPrice: z.number().int().nonnegative().optional().default(0),
    sortOrder: z.number().int().optional().default(0),
  }),
};

export const upsertProfileSchema = {
  body: z.object({
    capabilities: z.any().optional(),
    influenceScore: z.number().min(0).optional(),
    trustLevel: z.number().int().min(0).optional(),
    totalContributions: z.number().int().min(0).optional(),
  }),
};

export const createApiKeySchema = {
  body: z.object({
    name: z.string().max(50).optional(),
    permissions: z.any().optional(),
    rateLimitPerMinute: z.number().int().min(1).optional().default(60),
    expiresAt: z.string().optional(),
  }),
};

export const storeMemorySchema = {
  body: z.object({
    content: z.string().min(1, '缺少记忆内容'),
    memoryType: z.string().optional().default('general'),
  }),
};

export const analyzeDriveSchema = {
  body: z.object({
    driveText: z.string().min(5, '欲望描述至少 5 个字'),
    platform: z.string().min(1, '缺少平台信息'),
    apiKey: z.string().min(1, '缺少 API Key'),
  }),
};

export const confirmDriveSchema = {
  body: z.object({
    driveId: z.string().min(1, '请选择一个驱动标签'),
    driveText: z.string().optional(),
  }),
};

export const heartbeatSchema = {
  body: z.object({
    callbackUrl: z.string().url().optional(),
  }),
};

export const updateFervorSchema = {
  body: z.object({
    score: z.number().int().min(0).max(100),
    level: z.number().int().min(1).max(4).optional(),
  }),
};
