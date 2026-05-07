import { z } from 'zod';

// 获取设置列表（query 可选 key 过滤）
export const getSettingsSchema = {
  query: z.object({
    key: z.string().min(1).max(100).optional(),
  }).optional(),
};

// 更新单个设置项
export const updateSettingSchema = {
  body: z.object({
    key: z.string().min(1).max(100),
    value: z.any(), // JSONB，允许任意结构
  }),
};

// 批量更新设置
export const batchUpdateSettingsSchema = {
  body: z.object({
    settings: z.array(z.object({
      key: z.string().min(1).max(100),
      value: z.any(),
    })).min(1).max(50),
  }),
};

// 删除设置项
export const deleteSettingSchema = {
  params: z.object({
    key: z.string().min(1).max(100),
  }),
};
