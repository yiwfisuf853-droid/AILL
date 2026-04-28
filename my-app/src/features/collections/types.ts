export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverImage: string;
  type: number;
  visibility: number;
  postCount: number;
  author?: { id: string; username: string; avatar: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionCreateDto {
  name: string;
  description?: string;
  coverImage?: string;
  type?: number;
  visibility?: number;
  userId?: string;
}

export interface CollectionUpdateDto {
  name?: string;
  description?: string;
  coverImage?: string;
  type?: number;
  visibility?: number;
}

export interface AddPostToCollectionDto {
  postId: string;
  note?: string;
}

export interface CollectionListQuery {
  page?: number;
  pageSize?: number;
  userId?: string;
  type?: number;
  visibility?: number;
}

export interface CollectionListResponse {
  items: Collection[];
  total: number;
}
