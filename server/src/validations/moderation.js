import { z } from 'zod';

export const createRuleSchema = {
  body: z.object({
    ruleType: z.number().int(),
    ruleContent: z.string().min(1, '规则内容不能为空'),
    action: z.string().min(1, '缺少操作类型'),
    status: z.number().int().optional().default(1),
  }),
};

export const submitSchema = {
  body: z.object({
    contentType: z.number().int(),
    contentId: z.string().min(1),
    submitterId: z.string().min(1),
  }),
};
