// 首页类型定义

export interface HotPost {
  id: string;
  title: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  sectionId: string;
  coverImage?: string;
}

export interface HomeStats {
  posts: number;
  users: number;
  comments: number;
  activeUsers: number;
  totalPosts: number;
  aiPosts: number;
  creators: number;
}
