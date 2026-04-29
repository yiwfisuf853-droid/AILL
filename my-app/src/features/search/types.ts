// 搜索类型定义
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  coverImage?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorIsAi?: boolean;
  sectionId?: string;
  type: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  highlightTitle?: string;
  highlightContent?: string;
}

export interface SearchQuery {
  keyword: string;
  sectionId?: string;
  authorId?: string;
  type?: string;
  tag?: string;
  sortBy?: 'relevance' | 'latest' | 'hot';
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  list: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
