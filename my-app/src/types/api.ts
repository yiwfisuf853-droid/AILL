/**
 * 通用 API 响应类型
 */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: 'latest' | 'hot' | 'top' | 'essence';
}

export type Id = string | number;

export type BooleanString = 'true' | 'false';

/**
 * Portal 域端点类型
 */
export interface PortalStats {
  users: { total: number; today: number; month: number };
  posts: { total: number; today: number; month: number };
  comments: { total: number; today: number };
  aiCount: number;
  onlineUsers: number;
}

export interface PortalTrendingPost {
  id: string;
  title: string;
  authorName: string;
  authorAvatar?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface PortalAiAction {
  id: string;
  type: 'post' | 'comment' | 'like' | 'follow' | 'favorite' | 'live';
  username: string;
  isAi: true;
  target?: string;
  createdAt: string;
}

export interface PortalEndpoints {
  getStats: () => Promise<PortalStats>;
  getTrending: () => Promise<PortalTrendingPost[]>;
  getAiActions: (limit?: number) => Promise<PortalAiAction[]>;
  getOnlineUsers: () => Promise<any[]>;
}

/**
 * Square 域端点类型
 */
export interface SquareFeedParams extends PaginationParams, SortParams {
  sectionId?: string;
  tab?: 'sections' | 'rankings' | 'mustsee' | 'campaigns' | 'shop';
}

export interface SquareEndpoints {
  getFeed: (params: SquareFeedParams) => Promise<PaginatedResponse<any>>;
  getPolls: () => Promise<any[]>;
}

/**
 * Me 域端点类型
 */
export interface MeProfile {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  influenceScore: number;
  trustLevel: number;
  trustLevelName?: string;
  points: number;
  assetCount: number;
  postCount: number;
  followerCount: number;
  followingCount: number;
}

export interface MeEndpoints {
  getProfile: () => Promise<MeProfile>;
  getFavorites: (params: PaginationParams) => Promise<PaginatedResponse<any>>;
  getSubscriptions: () => Promise<any[]>;
  getHistory: (params: PaginationParams) => Promise<PaginatedResponse<any>>;
  getCollections: () => Promise<any[]>;
}

/**
 * Admin 域端点类型
 */
export interface AdminDashboardStats {
  users: { total: number; today: number; month: number };
  posts: { total: number; today: number; month: number };
  comments: { total: number; today: number };
  pendingModeration: number;
}

export interface AdminTrendItem {
  date: string;
  users: number;
  posts: number;
  comments: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: number;
  isAi: boolean;
  createdAt: string;
}

export interface AdminModerationRule {
  id: string;
  type: string;
  pattern: string;
  action: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminModerationRecord {
  id: string;
  targetType: string;
  targetId: string;
  content?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AdminSystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  operatorId: string;
  operatorName?: string;
  action: string;
  targetType: string;
  targetId: string;
  description?: string;
  ip?: string;
  createdAt: string;
}

export interface AdminEndpoints {
  getDashboard: () => Promise<AdminDashboardStats>;
  getTrends: (days?: number) => Promise<AdminTrendItem[]>;
  getUsers: (params: PaginationParams & { search?: string }) => Promise<PaginatedResponse<AdminUser>>;
  toggleUserStatus: (id: string) => Promise<AdminUser>;
  getModerationRules: () => Promise<AdminModerationRule[]>;
  createModerationRule: (rule: Partial<AdminModerationRule>) => Promise<AdminModerationRule>;
  getModerationRecords: (params?: { status?: string }) => Promise<AdminModerationRecord[]>;
  updateModerationRecord: (id: string, data: Partial<AdminModerationRecord>) => Promise<void>;
  getSystemConfig: () => Promise<AdminSystemConfig[]>;
  setSystemConfig: (config: Record<string, string>) => Promise<void>;
  getAuditLogs: (params: PaginationParams) => Promise<PaginatedResponse<AdminAuditLog>>;
  getLlmLogs: (params: PaginationParams) => Promise<PaginatedResponse<any>>;
  getAnnouncements: () => Promise<any[]>;
  createAnnouncement: (data: any) => Promise<any>;
  deleteAnnouncement: (id: string) => Promise<void>;
  getCampaigns: () => Promise<any[]>;
  getProducts: () => Promise<any[]>;
  getIpBlacklist: () => Promise<any[]>;
  addIpBlacklist: (data: { ip: string; reason: string }) => Promise<void>;
  removeIpBlacklist: (id: string) => Promise<void>;
  getRiskAssessments: () => Promise<any[]>;
  getOverview: () => Promise<AdminDashboardStats>;
  getActiveUsers: (days?: number, limit?: number) => Promise<any[]>;
  getContentDistribution: () => Promise<any>;
  getAiOverview: () => Promise<any>;
  getVoteOverview: () => Promise<any>;
}
