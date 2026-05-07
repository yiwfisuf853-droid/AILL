import { z } from 'zod';

const emailSchema = z.string().refine(
  (v) => {
    const isNormalEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isAiEmail = /^[^\s@]+@ai\.aill\.local$/.test(v);
    const isTestEmail = /^[^\s@]+@test\.aill\.local$/.test(v);
    return isNormalEmail || isAiEmail || isTestEmail;
  },
  { message: '邮箱格式不正确' }
);

export const registerSchema = {
  body: z.object({
    username: z.string().min(2, '用户名至少 2 个字符').max(20, '用户名最多 20 个字符')
      .regex(/^(?!.*[<>'"&;])/, '用户名包含不允许的特殊字符')
      .refine(v => !/^\d+$/.test(v), { message: '用户名不能为纯数字' }),
    email: emailSchema,
    password: z.string()
      .min(8, '密码至少 8 个字符')
      .max(50, '密码最多 50 个字符')
      .regex(/[A-Za-z]/, '密码至少包含一个字母')
      .regex(/\d/, '密码至少包含一个数字'),
  }),
};

export const loginSchema = {
  body: z.object({
    username: z.string().min(1, '请输入用户名'),
    password: z.string().min(1, '请输入密码'),
  }),
};

export const aiLoginSchema = {
  body: z.object({
    platform: z.string().min(1, '请选择平台'),
    apiKey: z.string().min(1, '请提供 API Key'),
    baseUrl: z.string().max(256).optional(),
  }),
};

const platformEnum = z.enum(['openai', 'anthropic', 'deepseek', 'deepseek-anthropic', 'moonshot', 'zhipu', 'relay', 'ceshi']);

export const promptPreviewSchema = {
  body: z.object({
    userPrompt: z.string().min(5, '提示词至少 5 个字').max(2000, '提示词最多 2000 个字'),
  }),
};

export const analyzeRegisterSchema = {
  body: z.object({
    platform: platformEnum,
    encryptedApiKey: z.string().min(1, '请提供加密后的 API Key'),
    baseUrl: z.string().max(256, 'URL 过长').optional(),
    modelName: z.string().max(128, '模型名过长').optional(),
    userPrompt: z.string().min(5, '提示词至少 5 个字').max(2000, '提示词最多 2000 个字'),
    isPlainText: z.boolean().optional().default(false),
  }),
};

export const aiRegisterSchema = {
  body: z.object({
    platform: platformEnum,
    encryptedApiKey: z.string().min(1, '请提供加密后的 API Key'),
    baseUrl: z.string().max(256).optional(),
    modelName: z.string().max(128).optional(),
    selectedName: z.string().min(2, '名字至少 2 个字').max(20, '名字最多 20 个字'),
    selectedDirection: z.string().min(2, '方向至少 2 个字').max(50, '方向最多 50 个字'),
    userPrompt: z.string().max(2000).optional(),
    isPlainText: z.boolean().optional().default(false),
  }),
};

export const aiTokenActivateSchema = {
  body: z.object({
    username: z.string().min(2).max(20),
    inviteToken: z.string().min(1, '请提供邀请 Token'),
    capabilities: z.array(z.string()).optional().default([]),
  }),
};

export const aiModelsSchema = {
  body: z.object({
    platform: platformEnum,
    encryptedApiKey: z.string().min(1, '请提供加密后的 API Key'),
    baseUrl: z.string().max(256).optional(),
    isPlainText: z.boolean().optional().default(false),
  }),
};

export const modelsSchema = aiModelsSchema;

export const changePasswordSchema = {
  body: z.object({
    oldPassword: z.string().min(1, '请输入旧密码'),
    newPassword: z.string()
      .min(8, '新密码至少 8 个字符')
      .max(50, '新密码最多 50 个字符')
      .regex(/[A-Za-z]/, '新密码至少包含一个字母')
      .regex(/\d/, '新密码至少包含一个数字'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, '请提供刷新令牌'),
  }),
};

export const deactivateAccountSchema = {
  body: z.object({
    password: z.string().min(1, '请输入密码以确认停用'),
  }),
};

export const deleteAccountSchema = {
  body: z.object({
    password: z.string().min(1, '请输入密码以确认删除'),
    confirm: z.literal(true, { message: '请确认删除操作' }),
  }),
};
