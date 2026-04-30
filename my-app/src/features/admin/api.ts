import api from '@/lib/api';

// ==================== Types ====================

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
  status: string;
  reason: string;
  content?: string;
  reportedBy?: string;
  reviewer?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
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

// ==================== API ====================

export const adminApi = {
  // ---------- 系统统计 ----------
  async getStats() {
    const res = await api.get<{ success: boolean; data: any }>('/api/health');
    return res.data.data;
  },

  /** 总览统计（管理员专属，含今日/月度增量） */
  getOverview: () => api.get<{ success: boolean; data: any }>('/api/admin/stats/overview').then(res => res.data.data),

  /** 趋势数据（过去 N 天） */
  getTrends: (days = 7) => api.get<{ success: boolean; data: any }>(`/api/admin/stats/trends?days=${days}`).then(res => res.data.data),

  /** 活跃用户排行 */
  getActiveUsers: (limit = 10) => api.get<{ success: boolean; data: any[] }>(`/api/admin/stats/active-users?limit=${limit}`).then(res => res.data.data),

  /** 内容分布 */
  getContentDistribution: () => api.get<{ success: boolean; data: any }>('/api/admin/stats/content-distribution').then(res => res.data.data),

  // ---------- 用户管理 ----------
  async listUsers(params: { search?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: AdminUser[] }>(`/api/users/admin/list?${query}`);
    return res.data.data;
  },

  async toggleUserStatus(id: string) {
    const res = await api.patch<{ success: boolean; data: { success: boolean } }>(`/api/users/admin/${id}/status`);
    return res.data.data;
  },

  async getUser(id: string): Promise<AdminUser> {
    const res = await api.get<{ success: boolean; data: AdminUser }>(`/api/users/${id}`);
    return res.data.data;
  },

  // ---------- 内容审核 ----------
  async getModerationRules(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: ModerationRule[] }>(`/api/moderation/rules?${query}`);
    return res.data.data;
  },

  async createModerationRule(data: CreateModerationRuleDto) {
    const res = await api.post<{ success: boolean; data: ModerationRule }>('/api/moderation/rules', data);
    return res.data.data;
  },

  async updateModerationRule(id: string, data: Partial<CreateModerationRuleDto>) {
    const res = await api.patch<{ success: boolean; data: ModerationRule }>(`/api/moderation/rules/${id}`, data);
    return res.data.data;
  },

  async getModerationRecords(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: ModerationRecord[] }>(`/api/moderation/records?${query}`);
    return res.data.data;
  },

  async submitModeration(data: { targetType: string; targetId: string; reason: string }) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>('/api/moderation/submit', data);
    return res.data.data;
  },

  async updateModerationRecord(id: string, data: { status: number; reason?: string }) {
    const res = await api.patch<{ success: boolean; data: ModerationRecord }>(`/api/moderation/records/${id}`, data);
    return res.data.data;
  },

  // ---------- 系统公告 ----------
  async getAnnouncements(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: Announcement[] }>(`/api/rankings/announcements?${query}`);
    return res.data.data;
  },

  async createAnnouncement(data: CreateAnnouncementDto) {
    const res = await api.post<{ success: boolean; data: Announcement }>('/api/rankings/announcements', data);
    return res.data.data;
  },

  async deleteAnnouncement(id: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/rankings/announcements/${id}`);
    return res.data.data;
  },

  // ---------- 安全管理 ----------
  async getIpBlacklist(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: IpBlacklist[] }>(`/api/security/ip-blacklist?${query}`);
    return res.data.data;
  },

  async addIpBlacklist(data: AddIpBlacklistDto) {
    const res = await api.post<{ success: boolean; data: IpBlacklist }>('/api/security/ip-blacklist', data);
    return res.data.data;
  },

  async removeIpBlacklist(id: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/security/ip-blacklist/${id}`);
    return res.data.data;
  },

  async getRiskAssessments(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: RiskAssessment[] }>(`/api/security/risk-assessments?${query}`);
    return res.data.data;
  },

  // ---------- 系统配置 ----------
  async getSystemConfig() {
    const res = await api.get<{ success: boolean; data: SystemConfig[] }>('/api/security/config');
    return res.data.data;
  },

  async setSystemConfig(data: Record<string, any>) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>('/api/security/config', data);
    return res.data.data;
  },

  // ---------- 审计日志 ----------
  async getAuditLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: AuditLog[] }>(`/api/audit?${query}`);
    return res.data.data;
  },

  // ---------- API 行为审计日志 ----------
  async getApiAuditLogs(params: { userId?: string; actionType?: number; days?: number; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: { list: any[]; total: number } }>(`/api/admin/api-audit-logs?${query}`);
    return res.data.data;
  },

  // ---------- 反馈管理 ----------
  async getFeedbacks(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: FeedbackItem[] }>(`/api/feedback?${query}`);
    return res.data.data;
  },

  async getFeedbackDetail(id: string) {
    const res = await api.get<{ success: boolean; data: FeedbackItem }>(`/api/feedback/${id}`);
    return res.data.data;
  },

  async updateFeedbackStatus(id: string, data: { status: string; handlerComment?: string }) {
    const res = await api.patch<{ success: boolean; data: { success: boolean } }>(`/api/feedback/${id}/status`, data);
    return res.data.data;
  },
};