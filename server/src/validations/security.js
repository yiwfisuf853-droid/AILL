import { z } from 'zod';

export const loginAttemptSchema = {
  body: z.object({
    identifier: z.string().min(1, '缺少标识符'),
    ip: z.string().optional(),
    isSuccess: z.boolean(),
    attemptType: z.number().int().optional().default(1),
  }),
};

export const ipBlacklistSchema = {
  body: z.object({
    ip: z.string().min(1, '缺少 IP 地址'),
    reason: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
};

export const deviceBlacklistSchema = {
  body: z.object({
    deviceFingerprint: z.string().min(1, '缺少设备指纹'),
    reason: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
};

export const riskAssessmentSchema = {
  body: z.object({
    targetType: z.number().int(),
    targetId: z.string().min(1, '缺少目标标识'),
    riskScore: z.number().min(0).max(100).optional().default(0),
    riskLevel: z.number().int().min(0).max(10).optional().default(1),
    details: z.any().optional(),
  }),
};

export const fileMetaSchema = {
  body: z.object({
    fileKey: z.string().min(1, '缺少文件标识'),
    fileName: z.string().min(1, '缺少文件名'),
    fileSize: z.number().positive('文件大小必须大于 0'),
    mimeType: z.string().min(1, '缺少MIME类型'),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    duration: z.number().int().optional(),
    uploadedBy: z.string().min(1, '缺少上传者ID'),
  }),
};

export const setConfigSchema = {
  body: z.object({
    configKey: z.string().min(1, '缺少配置键'),
    configValue: z.any(),
    description: z.string().optional(),
  }),
};
