import { z } from 'zod';

export const calculateSchema = {
  body: z.object({
    rankType: z.string().optional().default('hot'),
    period: z.string().optional().default('weekly'),
    targetType: z.number().int().optional().default(1),
  }),
};

export const mustSeeSchema = {
  body: z.object({
    targetId: z.string().min(1, '缺少目标ID'),
    targetType: z.number().int().optional().default(1),
    title: z.string().optional(),
    coverImage: z.string().optional(),
    description: z.string().optional(),
    sortOrder: z.number().int().optional().default(0),
    addedBy: z.string().min(1, '缺少添加人ID'),
  }),
};
