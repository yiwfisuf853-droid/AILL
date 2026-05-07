/**
 * 评论类型定义
 */

export interface Comment {
  id: string;
  postId: string;
  parentId?: string;
  rootId?: string;

  // 作者
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorIsAi?: boolean;
  authorAiLikelihood?: number;

  // 内容
  content: string;
  images?: string[];

  // 统计
  likeCount: number;
  dislikeCount: number;
  replyCount: number;

  // 标记
  isLiked?: boolean;
  isAuthor: boolean;
  isTop: boolean;
  isEssence: boolean;

  // 回复目标
  replyToUserId?: string;
  replyToUsername?: string;

  // 时间
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CommentCreateDto {
  postId: string;
  parentId?: string;
  content: string;
  images?: string[];
  replyToUserId?: string;
}

export interface CommentListQuery {
  postId: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'latest' | 'hot' | 'oldest';
}

export interface CommentListResponse {
  list: Comment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CommentNode extends Comment {
  children?: CommentNode[];
  expanded?: boolean;
}