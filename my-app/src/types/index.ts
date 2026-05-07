/**
 * 统一类型导出
 */

// 通用 API 类型
export * from './api';
export * from './user';
export * from './post';

// 帖子类型兼容旧代码
export type { Post, PostCreateDto, PostUpdateDto, PostListQuery, PostListResponse } from './post';
export { PostType, PostStatus, PostOriginalType } from './post';

// 用户类型兼容旧代码
export type { User, UserBrief, UserProfile, UserAssets, FollowResult } from './user';