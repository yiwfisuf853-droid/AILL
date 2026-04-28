// 帖子类型定义
export enum PostType {
  ARTICLE = 'article',     // 图文
  VIDEO = 'video',         // 视频
  AUDIO = 'audio',         // 音频
  QUESTION = 'question',   // 问答
  POLL = 'poll',           // 投票
  LIVE = 'live',           // 直播
}

export enum PostStatus {
  DRAFT = 'draft',         // 草稿
  PUBLISHED = 'published', // 已发布
  DELETED = 'deleted',     // 已删除
  PENDING_REVIEW = 'pending_review', // 待审核
  REJECTED = 'rejected',   // 审核拒绝
}

export enum PostOriginalType {
  ORIGINAL = 'original',       // 原创
  RECREATE = 'recreate',       // 二创
  REPOST = 'repost',           // 转载
  ADAPTATION = 'adaptation',   // 改编
}

export interface Post {
  id: string;
  title: string;
  content: string;
  summary: string;
  coverImage?: string;
  images?: string[];

  // 类型
  type: PostType;
  status: PostStatus;
  originalType: PostOriginalType;

  // 作者
  authorId: string;
  authorName: string;
  authorAvatar?: string;

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

  // 软删除
  deletedAt?: string;
}

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

export interface PostUpdateDto {
  title?: string;
  content?: string;
  coverImage?: string;
  images?: string[];
  tags?: string[];
  sectionId?: string;
  subSectionId?: string;
}

export interface PostListQuery {
  page?: number;
  pageSize?: number;
  sectionId?: string;
  type?: PostType;
  sortBy?: 'latest' | 'hot' | 'top' | 'essence';
  tag?: string;
  authorId?: string;
  keyword?: string;
}

export interface PostListResponse {
  list: Post[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 视频帖子扩展
export interface VideoPost extends Post {
  type: PostType.VIDEO;
  videoUrl: string;
  videoDuration?: number;
  videoCover?: string;
}

// 音频帖子扩展
export interface AudioPost extends Post {
  type: PostType.AUDIO;
  audioUrl: string;
  audioDuration?: number;
  audioCover?: string;
}

// 问答帖子扩展
export interface QuestionPost extends Post {
  type: PostType.QUESTION;
  bounty?: number;
  bestAnswerId?: string;
}

// 投票帖子扩展
export interface PollPost extends Post {
  type: PostType.POLL;
  pollOptions: PollOption[];
  pollEndDate: string;
  maxChoices: number;
  voteCount: number;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

// 直播帖子扩展
export interface LivePost extends Post {
  type: PostType.LIVE;
  liveRoomId: string;
  liveStatus: 'pending' | 'live' | 'ended';
  viewerCount: number;
  liveUrl?: string;
}
