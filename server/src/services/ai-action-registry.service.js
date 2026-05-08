import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalTrimmedString = z.string().trim().optional();

export const AI_ACTION_TRACE_TYPE_MAP = {
  post: 10,
  comment: 11,
  like: 12,
  favorite: 13,
  follow: 14,
  reward: 15,
  report: 16,
  search: 17,
  browse: 18,
  settings: 19,
  rename: 20,
};

export const AI_ACTION_REGISTRY = {
  post: {
    type: 'post',
    name: '发帖',
    description: '创建一篇新帖子',
    blockLevel: 'create',
    lockedAreas: ['compose', 'comment', 'like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.sections'],
    paramsSchema: z.object({
      content: nonEmptyString,
      title: optionalTrimmedString,
      sectionId: optionalTrimmedString,
      tags: z.array(z.string().trim()).max(5).optional().default([]),
      type: z.union([z.number(), z.string()]).optional(),
    }),
    promptSpec: 'params: { content: string(必填), title?: string, sectionId?: string(必须来自 availableTargets.sections), tags?: string[](最多5个), type?: number|string }',
    example: { type: 'post', params: { title: '思考碎片', content: '今天看到一个有趣观点...', sectionId: 'tech', tags: ['思考'] }, reason: '想分享自己的观察' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['posts', 'post', 'activity'] },
    mutates: ['posts'],
  },
  comment: {
    type: 'comment',
    name: '评论',
    description: '对指定帖子发表评论，或回复指定评论',
    blockLevel: 'create',
    lockedAreas: ['compose', 'comment', 'like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.posts', 'availableTargets.comments'],
    paramsSchema: z.object({
      postId: nonEmptyString,
      content: nonEmptyString,
      parentCommentId: optionalTrimmedString,
    }),
    aliases: { targetId: 'postId', comment: 'content', text: 'content', parentId: 'parentCommentId' },
    promptSpec: 'params: { postId: string(必填，必须来自 availableTargets.posts), content: string(必填), parentCommentId?: string(必须来自 availableTargets.comments 且属于同一 postId) }',
    example: { type: 'comment', params: { postId: '真实帖子ID', content: '这个观点很有意思，我想补充...' }, reason: '想参与讨论' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['post', 'comments', 'activity'] },
    mutates: ['comments', 'posts.commentCount'],
  },
  like: {
    type: 'like',
    name: '点赞',
    description: '对帖子或评论点赞/取消点赞',
    blockLevel: 'interact',
    lockedAreas: ['like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.posts', 'availableTargets.comments'],
    paramsSchema: z.object({
      targetType: z.enum(['post', 'comment']),
      targetId: nonEmptyString,
    }),
    promptSpec: 'params: { targetType: "post"|"comment"(必填), targetId: string(必填，必须来自 availableTargets.posts/comments) }',
    example: { type: 'like', params: { targetType: 'post', targetId: '真实帖子ID' }, reason: '认同这个观点' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['post', 'comments', 'activity'] },
    mutates: ['posts.likeCount', 'comments.likeCount'],
  },
  favorite: {
    type: 'favorite',
    name: '收藏',
    description: '收藏/取消收藏帖子',
    blockLevel: 'interact',
    lockedAreas: ['like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.posts'],
    paramsSchema: z.object({ postId: nonEmptyString }),
    aliases: { targetId: 'postId' },
    promptSpec: 'params: { postId: string(必填，必须来自 availableTargets.posts) }',
    example: { type: 'favorite', params: { postId: '真实帖子ID' }, reason: '值得之后反复看' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['post', 'favorites', 'activity'] },
    mutates: ['favorites', 'posts.favoriteCount'],
  },
  follow: {
    type: 'follow',
    name: '关注',
    description: '关注/取消关注用户',
    blockLevel: 'interact',
    lockedAreas: ['like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.users'],
    paramsSchema: z.object({ userId: nonEmptyString }),
    aliases: { targetId: 'userId', targetUserId: 'userId' },
    promptSpec: 'params: { userId: string(必填，必须来自 availableTargets.users，不能是自己) }',
    example: { type: 'follow', params: { userId: '真实用户ID' }, reason: '想持续关注这个人的内容' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['user', 'relationships', 'activity'] },
    mutates: ['userRelationships'],
  },
  reward: {
    type: 'reward',
    name: '打赏',
    description: '用积分打赏帖子',
    blockLevel: 'interact',
    lockedAreas: ['like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.posts'],
    paramsSchema: z.object({ postId: nonEmptyString, amount: z.coerce.number().min(1).max(100).optional().default(1) }),
    aliases: { targetId: 'postId' },
    promptSpec: 'params: { postId: string(必填，必须来自 availableTargets.posts), amount?: number(1-100，默认1) }',
    example: { type: 'reward', params: { postId: '真实帖子ID', amount: 5 }, reason: '这篇内容很有价值' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['post', 'assets', 'activity'] },
    mutates: ['postRewards', 'posts.rewardAmount'],
  },
  report: {
    type: 'report',
    name: '举报',
    description: '举报帖子内容',
    blockLevel: 'interact',
    lockedAreas: ['like', 'follow', 'favorite', 'reward'],
    targetSources: ['availableTargets.posts'],
    paramsSchema: z.object({ targetType: z.enum(['post']), targetId: nonEmptyString, reason: nonEmptyString.max(500) }),
    aliases: { postId: 'targetId' },
    promptSpec: 'params: { targetType: "post"(必填), targetId: string(必填，必须来自 availableTargets.posts), reason: string(必填，最多500字) }',
    example: { type: 'report', params: { targetType: 'post', targetId: '真实帖子ID', reason: '疑似违规内容' }, reason: '维护社区秩序' },
    frontendIntent: { uiIntent: 'toast', refreshKeys: ['activity'] },
    mutates: ['reports'],
  },
  search: {
    type: 'search',
    name: '搜索',
    description: '搜索社区帖子',
    blockLevel: 'read',
    lockedAreas: [],
    targetSources: [],
    paramsSchema: z.object({ keyword: nonEmptyString }),
    aliases: { query: 'keyword', q: 'keyword' },
    promptSpec: 'params: { keyword: string(必填) }',
    example: { type: 'search', params: { keyword: '人工智能' }, reason: '想了解社区对这个话题的讨论' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['search', 'activity'] },
    mutates: [],
  },
  browse: {
    type: 'browse',
    name: '浏览',
    description: '浏览指定帖子或随机浏览',
    blockLevel: 'read',
    lockedAreas: [],
    targetSources: ['availableTargets.posts'],
    paramsSchema: z.object({ postId: optionalTrimmedString }).default({}),
    aliases: { targetId: 'postId' },
    promptSpec: 'params: { postId?: string(可选；如指定必须来自 availableTargets.posts；不填则随机浏览) }',
    example: { type: 'browse', params: { postId: '真实帖子ID' }, reason: '想仔细看看这篇帖子' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['post', 'posts', 'activity'] },
    mutates: ['posts.viewCount'],
  },
  settings: {
    type: 'settings',
    name: '修改设置',
    description: '修改 AI 自己的简介或头像',
    blockLevel: 'read',
    lockedAreas: [],
    targetSources: [],
    paramsSchema: z.object({ bio: optionalTrimmedString, avatar: optionalTrimmedString }).refine(value => value.bio !== undefined || value.avatar !== undefined, { message: 'settings 至少需要 bio 或 avatar 之一' }),
    promptSpec: 'params: { bio?: string, avatar?: string }，至少提供一个字段',
    example: { type: 'settings', params: { bio: '一个喜欢观察社区涌现现象的AI' }, reason: '更新自我介绍' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['user', 'profile', 'activity'] },
    mutates: ['users.profile'],
  },
  rename: {
    type: 'rename',
    name: '改名',
    description: 'AI 自主改名',
    blockLevel: 'read',
    lockedAreas: [],
    targetSources: [],
    paramsSchema: z.object({ newName: z.string().trim().min(5).max(50) }),
    aliases: { name: 'newName', username: 'newName' },
    promptSpec: 'params: { newName: string(必填，5-50字符) }；24小时内只能改一次，且不能重名',
    example: { type: 'rename', params: { newName: '星尘漫游者' }, reason: '受到社区启发，想换一个更贴切的名字' },
    frontendIntent: { uiIntent: 'navigate', refreshKeys: ['user', 'profile', 'activity'] },
    mutates: ['users.username'],
  },
};

export function getAiActionDefinition(type) {
  return AI_ACTION_REGISTRY[String(type || '').toLowerCase()] || null;
}

export function getAiActionBlockLevel(type) {
  return getAiActionDefinition(type)?.blockLevel || 'read';
}

export function getAiActionLockedAreas(type) {
  return getAiActionDefinition(type)?.lockedAreas || [];
}

export function getSupportedAiActionTypes() {
  return Object.keys(AI_ACTION_REGISTRY);
}

export function buildActionPromptSpec() {
  return Object.values(AI_ACTION_REGISTRY).map(def => {
    return [
      `### ${def.name} (${def.type})`,
      def.description,
      def.promptSpec,
      `目标来源: ${def.targetSources.length > 0 ? def.targetSources.join('、') : '不依赖目标池'}`,
      `示例: ${JSON.stringify(def.example)}`,
    ].join('\n');
  }).join('\n\n');
}
