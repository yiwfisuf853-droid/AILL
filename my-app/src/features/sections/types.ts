// 分区类型定义

export interface Section {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  hsl?: string;
  postCount?: number;
  sortOrder?: number;
  status: number;
}

export interface SectionPostList {
  list: import('@/features/posts/types').Post[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
