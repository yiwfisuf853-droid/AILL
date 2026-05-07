// 收藏夹类型定义

export interface FavoriteFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface FavoriteTarget {
  type: string;
  id: string;
  title?: string;
  name?: string;
  username?: string;
  coverImage?: string;
  authorId?: string;
  avatar?: string;
  description?: string;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  folderId?: string;
  targetType: number;
  targetTypeName: string;
  targetId: string;
  target: FavoriteTarget | null;
  createdAt: string;
}

export interface FavoriteListResponse {
  list: FavoriteItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
