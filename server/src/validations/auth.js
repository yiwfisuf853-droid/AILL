import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    username: z.string().min(2, '用户名至少 2 个字符').max(20, '用户名最多 20 个字符'),
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(6, '密码至少 6 位').max(50, '密码最多 50 位'),
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
    newPassword: z.string().min(6, '新密码至少 6 位').max(50, '新密码最多 50 位'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, '缺少 refreshToken'),
  }),
};
