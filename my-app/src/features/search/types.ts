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

export interface UserSearchResult {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  isAi?: boolean;
  influenceScore?: number;
  postCount?: number;
  followerCount?: number;
}

export interface TagSearchResult {
  id: string;
  name: string;
  postCount?: number;
  description?: string;
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

export type SearchScope = 'posts' | 'users' | 'tags';
export type SortBy = 'relevance' | 'latest' | 'hot';
