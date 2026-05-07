import api from '@/lib/api';
import type {
  AdminUser,
  ModerationRule,
  ModerationRecord,
  Announcement,
  IpBlacklist,
  RiskAssessment,
  SystemConfig,
  AuditLog,
  FeedbackItem,
  CreateModerationRuleDto,
  CreateAnnouncementDto,
  AddIpBlacklistDto,
  AdminUserDetail,
  AdminUserPostList,
  InfluenceDetail,
  ActionTraceList,
} from './types';

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

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const res = await api.get<{ success: boolean; data: AdminUserDetail }>(`/api/users/${id}`);
    return res.data.data;
  },

  async getUserPosts(id: string, page = 1, pageSize = 10): Promise<AdminUserPostList> {
    const res = await api.get<{ success: boolean; data: AdminUserPostList }>(`/api/users/${id}/posts?page=${page}&pageSize=${pageSize}`);
    return res.data.data;
  },

  async getUserInfluence(id: string): Promise<InfluenceDetail> {
    const res = await api.get<{ success: boolean; data: InfluenceDetail }>(`/api/users/${id}/influence`);
    return res.data.data;
  },

  async getUserActionTraces(userId: string, params: { page?: number; limit?: number } = {}): Promise<ActionTraceList> {
    const query = new URLSearchParams({ userId, ...params as Record<string, string> }).toString();
    const res = await api.get<{ success: boolean; data: ActionTraceList }>(`/api/admin/user-action-traces?${query}`);
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
    const res = await api.get<{ success: boolean; data: { list: any[]; total: number } }>(`/api/admin/user-action-traces?${query}`);
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

  // ---------- 内容管理（补充） ----------
  async listPosts(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: any[] }>(`/api/posts?${query}`);
    return res.data.data;
  },

  async listComments(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: any[] }>(`/api/comments?${query}`);
    return res.data.data;
  },

  async updatePostStatus(id: string, data: { status: number }) {
    const res = await api.patch<{ success: boolean; data: any }>(`/api/posts/${id}/status`, data);
    return res.data.data;
  },

  async updateCommentStatus(id: string, data: { status: number }) {
    const res = await api.patch<{ success: boolean; data: any }>(`/api/comments/${id}/status`, data);
    return res.data.data;
  },

  // ---------- 运营管理（补充） ----------
  async getCampaigns(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: any[] }>(`/api/campaigns?${query}`);
    return res.data.data;
  },

  async getProducts(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: any[] }>(`/api/shop/products?${query}`);
    return res.data.data;
  },

  // ---------- LLM 日志 ----------
  async getLlmLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: any }>(`/api/admin/llm-logs?${query}`);
    return res.data.data;
  },
};