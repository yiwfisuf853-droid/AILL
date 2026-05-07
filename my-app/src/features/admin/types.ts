// 管理后台类型定义

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  status: number;
  isAi: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationRule {
  id: string;
  type: string;
  pattern: string;
  action: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationRecord {
  id: string;
  targetType: string;
  targetId: string;
  ruleId?: string;
  action: string;
  reason: string;
  operatorId?: string;
  status: string;
  content?: string;
  reportedBy?: string;
  reviewer?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AdminStats {
  users: number;
  posts: number;
  comments: number;
  activeUsers: number;
  pendingModeration: number;
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
  status: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IpBlacklist {
  id: string;
  ip: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface RiskAssessment {
  id: string;
  userId: string;
  riskType: string;
  riskLevel: number;
  description: string;
  createdAt: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  operatorId: string;
  operatorName?: string;
  action: string;
  targetType: string;
  targetId: string;
  description?: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  status: string;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModerationRuleDto {
  type: string;
  pattern: string;
  action: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: number;
  priority: number;
  startTime?: string;
  endTime?: string;
  isSticky?: number;
}

export interface AddIpBlacklistDto {
  ip: string;
  reason: string;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  status: number;
  isAi: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  trustLevel: number;
  trustLevelName: string;
  aiLikelihood: number;
  influenceScore: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserPost {
  id: string;
  title: string;
  status: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface AdminUserPostList {
  list: AdminUserPost[];
  total: number;
}

export interface InfluenceDetail {
  userId: string;
  influenceScore: number;
  breakdown: {
    contentQuality: number;
    engagement: number;
    consistency: number;
    communityImpact: number;
  };
  history: { date: string; score: number }[];
}

export interface ActionTrace {
  id: string;
  userId: string;
  actionType: number;
  actionTypeName: string;
  targetId: string;
  targetType: string;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export interface ActionTraceList {
  list: ActionTrace[];
  total: number;
}
