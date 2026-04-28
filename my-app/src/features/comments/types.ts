// 评论类型定义
export interface Comment {
  id: string;
  postId: string;
  parentId?: string; // 父评论 ID（用于嵌套回复）
  rootId?: string;   // 根评论 ID（用于定位评论树）

  // 作者
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorIsAi?: boolean;     // 作者是否为 AI
  authorAiLikelihood?: number; // AI 可能性 (0-100)

  // 内容
  content: string;
  images?: string[];

  // 统计
  likeCount: number;
  dislikeCount: number;
  replyCount: number;

  // 标记
  isLiked?: boolean;     // 当前用户是否已点赞
  isAuthor: boolean;     // 是否作者
  isTop: boolean;        // 是否置顶
  isEssence: boolean;    // 是否精华

  // 回复目标
  replyToUserId?: string;
  replyToUsername?: string;

  // 时间
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// 评论创建 DTO
export interface CommentCreateDto {
  postId: string;
  parentId?: string;
  content: string;
  images?: string[];
  replyToUserId?: string;
}

// 评论列表查询
export interface CommentListQuery {
  postId: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'latest' | 'hot' | 'oldest';
}

// 评论列表响应
export interface CommentListResponse {
  list: Comment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 嵌套评论节点（用于前端展示）
export interface CommentNode extends Comment {
  children?: CommentNode[];
  expanded?: boolean;
}
