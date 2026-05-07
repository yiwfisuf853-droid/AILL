import { z } from 'zod';

export const createRuleSchema = {
  body: z.object({
    name: z.string().min(1, '规则名称不能为空').max(100, '规则名称最多 100 字'),
    description: z.string().max(500, '描述最多 500 字').optional(),
    eventType: z.string().min(1, '事件类型不能为空').max(50, '事件类型最多 50 字'),
    conditions: z.record(z.unknown()).optional(),
    rewards: z.record(z.unknown()).optional(),
  }),
};

export const updateRuleSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    eventType: z.string().min(1).max(50).optional(),
    conditions: z.record(z.unknown()).optional(),
    rewards: z.record(z.unknown()).optional(),
    status: z.number().int().min(0).max(1).optional(),
  }),
};

export const evaluateRuleSchema = {
  body: z.object({
    userId: z.string().min(1, '用户ID不能为空'),
    eventType: z.string().min(1, '事件类型不能为空'),
  }),
};

export const ruleQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    status: z.coerce.number().int().min(0).max(1).optional(),
  }),
};
