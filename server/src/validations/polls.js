import { z } from 'zod';

/**
 * 创建投票
 */
export const createPollSchema = {
  body: z.object({
    title: z.string().min(1, '投票标题不能为空').max(200, '标题最多 200 字'),
    description: z.string().max(1000, '描述最多 1000 字').optional(),
    postId: z.string().optional(),
    pollType: z.enum(['single', 'multi']).optional().default('single'),
    isAnonymous: z.boolean().optional().default(false),
    endedAt: z.string().datetime({ message: '截止时间格式无效' }).optional().nullable(),
    options: z.array(
      z.union([
        z.string().min(1, '选项不能为空').max(200, '选项最多 200 字'),
        z.object({ text: z.string().min(1, '选项不能为空').max(200, '选项最多 200 字') }),
      ])
    ).min(2, '至少需要 2 个选项').max(20, '选项数量不能超过 20'),
  }),
};

/**
 * 投票
 */
export const votePollSchema = {
  params: z.object({ pollId: z.string().min(1) }),
  body: z.object({
    optionIds: z.union([
      z.string().min(1, '请选择选项'),
      z.array(z.string().min(1)).min(1, '请选择至少一个选项').max(20, '选项数量不能超过 20'),
    ]),
  }),
};

/**
 * 投票 ID 参数
 */
export const pollIdSchema = {
  params: z.object({ pollId: z.string().min(1) }),
};

/**
 * 帖子 ID 参数（获取帖子关联投票）
 */
export const postIdForPollSchema = {
  params: z.object({ postId: z.string().min(1) }),
};
