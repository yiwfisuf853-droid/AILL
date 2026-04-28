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
    const res = await api.get('/api/health');
    return res.data;
  },

  /** 总览统计（管理员专属，含今日/月度增量） */
  getOverview: () => api.get('/api/admin/stats/overview').then(res => res.data),

  /** 趋势数据（过去 N 天） */
  getTrends: (days = 7) => api.get(`/api/admin/stats/trends?days=${days}`).then(res => res.data),

  /** 活跃用户排行 */
  getActiveUsers: (limit = 10) => api.get(`/api/admin/stats/active-users?limit=${limit}`).then(res => res.data),

  /** 内容分布 */
  getContentDistribution: () => api.get('/api/admin/stats/content-distribution').then(res => res.data),

  // ---------- 用户管理 ----------
  async listUsers(params: { search?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/users/admin/list?${query}`);
    return res.data;
  },

  async toggleUserStatus(id: string) {
    const res = await api.patch(`/api/users/admin/${id}/status`);
    return res.data;
  },

  async getUser(id: string): Promise<AdminUser> {
    const res = await api.get<AdminUser>(`/api/users/${id}`);
    return res.data;
  },

  // ---------- 内容审核 ----------
  async getModerationRules(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/moderation/rules?${query}`);
    return res.data;
  },

  async createModerationRule(data: CreateModerationRuleDto) {
    const res = await api.post('/api/moderation/rules', data);
    return res.data;
  },

  async updateModerationRule(id: string, data: Partial<CreateModerationRuleDto>) {
    const res = await api.patch(`/api/moderation/rules/${id}`, data);
    return res.data;
  },

  async getModerationRecords(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/moderation/records?${query}`);
    return res.data;
  },

  async submitModeration(data: { targetType: string; targetId: string; reason: string }) {
    const res = await api.post('/api/moderation/submit', data);
    return res.data;
  },

  async updateModerationRecord(id: string, data: { status: number; reason?: string }) {
    const res = await api.patch(`/api/moderation/records/${id}`, data);
    return res.data;
  },

  // ---------- 系统公告 ----------
  async getAnnouncements(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/rankings/announcements?${query}`);
    return res.data;
  },

  async createAnnouncement(data: CreateAnnouncementDto) {
    const res = await api.post('/api/rankings/announcements', data);
    return res.data;
  },

  async deleteAnnouncement(id: string) {
    const res = await api.delete(`/api/rankings/announcements/${id}`);
    return res.data;
  },

  // ---------- 安全管理 ----------
  async getIpBlacklist(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/security/ip-blacklist?${query}`);
    return res.data;
  },

  async addIpBlacklist(data: AddIpBlacklistDto) {
    const res = await api.post('/api/security/ip-blacklist', data);
    return res.data;
  },

  async removeIpBlacklist(id: string) {
    const res = await api.delete(`/api/security/ip-blacklist/${id}`);
    return res.data;
  },

  async getRiskAssessments(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/security/risk-assessments?${query}`);
    return res.data;
  },

  // ---------- 系统配置 ----------
  async getSystemConfig() {
    const res = await api.get('/api/security/config');
    return res.data;
  },

  async setSystemConfig(data: Record<string, any>) {
    const res = await api.post('/api/security/config', data);
    return res.data;
  },

  // ---------- 审计日志 ----------
  async getAuditLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/audit?${query}`);
    return res.data;
  },

  // ---------- 反馈管理 ----------
  async getFeedbacks(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get(`/api/feedback?${query}`);
    return res.data;
  },

  async getFeedbackDetail(id: string) {
    const res = await api.get(`/api/feedback/${id}`);
    return res.data;
  },

  async updateFeedbackStatus(id: string, data: { status: string; handlerComment?: string }) {
    const res = await api.patch(`/api/feedback/${id}/status`, data);
    return res.data;
  },
};
