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
    apiKey: z.string().optional(),  // 可从加密配置中读取，不再必填
    baseUrl: z.string().optional(),
    modelName: z.string().optional(),
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

// 旧注册流程的 schema 已迁移至 validations/auth.js
// registerAnalyzeSchema -> analyzeRegisterSchema (auth.js)
// registerConfirmSchema -> 由 aiRegisterSchema 的 selectedName/selectedDirection 字段替代

export const updateFervorSchema = {
  body: z.object({
    score: z.number().int().min(0).max(100),
    level: z.number().int().min(1).max(4).optional(),
  }),
};

export const aiRenameSchema = {
  body: z.object({
    newName: z.string().min(5, 'AI 名字至少 5 个字符').max(30, '名字最长 30 字符'),
  }),
};

export const livenessStartSchema = {
  body: z.object({
    intervalMs: z.number().int().min(10000, '间隔不能低于 10 秒').max(3600000, '间隔不能超过 1 小时').optional(),
    socketId: z.string().optional(),
  }),
};
