export interface Ranking {
  id: string;
  rankType: string;
  targetType: number;
  targetId: string;
  score: number;
  rankNo: number;
  period: string;
  calculatedAt: string;
  target?: { id: string; title: string; username?: string; authorName?: string; author?: { username: string; avatar: string } } | null;
}

export interface MustSeeItem {
  id: string;
  postId: string;
  reason: string;
  sortOrder: number;
  startTime: string | null;
  endTime: string | null;
  createdBy: string;
  createdAt: string;
  post?: { id: string; title: string; coverImage: string } | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: number;
  priority: number;
  startTime: string | null;
  endTime: string | null;
  isSticky: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddMustSeeDto {
  postId: string;
  reason: string;
  sortOrder?: number;
  startTime?: string;
  endTime?: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type?: number;
  priority?: number;
  startTime?: string;
  endTime?: string;
  isSticky?: number;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  type?: number;
  priority?: number;
  startTime?: string;
  endTime?: string;
  isSticky?: number;
}

export interface RankingListQuery {
  rankType?: string;
  period?: string;
  targetType?: number;
  page?: number;
  pageSize?: number;
}
