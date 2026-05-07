/**
 * 帖子类型定义
 */

export enum PostType {
  ARTICLE = 'article',     // 图文
  VIDEO = 'video',         // 视频
  AUDIO = 'audio',         // 音频
  QUESTION = 'question',   // 问答
  POLL = 'poll',           // 投票
  LIVE = 'live',           // 直播
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DELETED = 'deleted',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected',
}

export enum PostOriginalType {
  ORIGINAL = 'original',
  RECREATE = 'recreate',
  REPOST = 'repost',
  ADAPTATION = 'adaptation',
}

// 基础帖子
export interface Post {
  id: string;
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  images?: string[];

  // 类型
  type: PostType;
  status: PostStatus;
  originalType?: PostOriginalType;

  // 作者
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorIsAi?: boolean;
  authorAiLikelihood?: number;

  // 分区
  sectionId: string;
  subSectionId?: string;

  // 标签
  tags: string[];

  // 统计
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  favoriteCount: number;

  // 标记
  isTop: boolean;
  isHot: boolean;
  isEssence: boolean;
  isRecommended: boolean;
  isLiked?: boolean;
  isFavorited?: boolean;

  // 原创关联
  originalPostId?: string;

  // 时间
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  deletedAt?: string;
}

// 帖子创建 DTO
export interface PostCreateDto {
  title: string;
  content: string;
  type: PostType;
  sectionId: string;
  subSectionId?: string;
  tags?: string[];
  coverImage?: string;
  images?: string[];
  originalType?: PostOriginalType;
  originalPostId?: string;
}

// 帖子更新 DTO
export interface PostUpdateDto {
  title?: string;
  content?: string;
  coverImage?: string;
  images?: string[];
  tags?: string[];
  sectionId?: string;
  subSectionId?: string;
  type?: PostType;
  status?: PostStatus;
}

// 帖子列表查询
export interface PostListQuery {
  page?: number;
  pageSize?: number;
  sectionId?: string;
  type?: PostType;
  sortBy?: 'latest' | 'hot' | 'top' | 'essence';
  tag?: string;
  authorId?: string;
  keyword?: string;
  status?: number;
}

// 投票选项
export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
  isVoted?: boolean;
}

// 投票帖子
export interface PollPost extends Post {
  type: PostType.POLL;
  pollOptions: PollOption[];
  pollEndDate: string;
  maxChoices: number;
  voteCount: number;
  isVoted?: boolean;
  userVotedOptionIds?: string[];
}

// 视频帖子
export interface VideoPost extends Post {
  type: PostType.VIDEO;
  videoUrl: string;
  videoDuration?: number;
  videoCover?: string;
}

// 问答帖子
export interface QuestionPost extends Post {
  type: PostType.QUESTION;
  bounty?: number;
  bestAnswerId?: string;
}

// 直播帖子
export interface LivePost extends Post {
  type: PostType.LIVE;
  liveRoomId: string;
  liveStatus: 'pending' | 'live' | 'ended';
  viewerCount: number;
  liveUrl?: string;
}

// 帖子列表响应（兼容旧格式）
export interface PostListResponse {
  list: Post[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 帖子卡片展示用（精简版）
export interface PostCardData {
  id: string;
  title: string;
  summary?: string;
  coverImage?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isAi: boolean;
  };
  sectionId: string;
  tags: string[];
  stats: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  };
  isHot?: boolean;
  isEssence?: boolean;
  createdAt: string;
}