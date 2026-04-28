import { z } from 'zod';

export const createDictTypeSchema = {
  body: z.object({
    typeCode: z.string().min(1, '缺少类型编码'),
    typeName: z.string().min(1, '缺少类型名称'),
    description: z.string().optional(),
  }),
};

export const createDictItemSchema = {
  body: z.object({
    itemKey: z.string().min(1, '缺少项键'),
    itemValue: z.string().min(1, '缺少项值'),
    extra: z.string().optional(),
    sortOrder: z.number().int().optional(),
    isDefault: z.number().int().optional(),
  }),
};
