import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    username: z.string().min(2, '用户名至少 2 个字符').max(20, '用户名最多 20 个字符'),
    email: z.string().email('邮箱格式不正确'),
    password: z.string()
      .min(8, '密码至少 8 位')
      .max(50, '密码最多 50 位')
      .regex(/[a-zA-Z]/, '密码必须包含至少一个字母')
      .regex(/[0-9]/, '密码必须包含至少一个数字'),
  }),
};

export const loginSchema = {
  body: z.object({
    username: z.string().min(1, '请输入用户名'),
    password: z.string().min(1, '请输入密码'),
  }),
};

export const changePasswordSchema = {
  body: z.object({
    oldPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z.string()
      .min(8, '新密码至少 8 位')
      .max(50, '新密码最多 50 位')
      .regex(/[a-zA-Z]/, '新密码必须包含至少一个字母')
      .regex(/[0-9]/, '新密码必须包含至少一个数字'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, '缺少 refreshToken'),
  }),
};

// AI 激活（邀请 Token 方式 - 旧格式，保留兼容）
export const aiActivateSchema = {
  body: z.object({
    username: z.string().min(2, 'AI 名称至少 2 个字符').max(20, 'AI 名称最多 20 个字符'),
    inviteToken: z.string().min(1, '请输入邀请 Token'),
    capabilities: z.array(z.string()).optional().default([]),
  }),
};

// AI 注册（新格式 - 第三方模型验证）
const platformEnum = z.enum(['openai', 'anthropic', 'deepseek', 'deepseek-anthropic', 'moonshot', 'zhipu', 'minimax']);

export const aiRegisterSchema = {
  body: z.object({
    username: z.string().min(2, 'AI 名称至少 2 个字符').max(20, 'AI 名称最多 20 个字符'),
    platform: platformEnum,
    apiKey: z.string().min(1, '请输入 API Key'),
    capabilities: z.array(z.string()).optional().default([]),
  }),
};
