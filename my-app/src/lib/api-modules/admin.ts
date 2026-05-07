/**
 * Admin 域 API 封装
 * 基于 features/admin/api.ts 的统一域级入口，re-export 原有 adminApi 并补充缺失封装
 */
import api from '@/lib/api';
import type {
  AdminDashboardStats,
  AdminTrendItem,
  AdminUser,
  AdminModerationRule,
  AdminModerationRecord,
  AdminSystemConfig,
  AdminAuditLog,
  PaginatedResponse,
  PaginationParams,
} from '@/types/api';

// Re-export 原有 feature 级 adminApi，保持向后兼容
export { adminApi } from '@/features/admin/api';

/** 域级 Admin API：在 feature 级基础上补充统一类型约束和缺失方法 */
export const adminDomainApi = {
  // ── 系统统计 ──

  /** 总览统计 */
  async getOverview(): Promise<AdminDashboardStats> {
    const response = await api.get<{ success: boolean; data: AdminDashboardStats }>('/api/admin/stats/overview');
    return response.data.data;
  },

  /** 趋势数据 */
  async getTrends(days?: number): Promise<AdminTrendItem[]> {
    const d = days ?? 7;
    const response = await api.get<{ success: boolean; data: AdminTrendItem[] }>(`/api/admin/stats/trends?days=${d}`);
    return response.data.data;
  },

  /** 活跃用户排行 */
  async getActiveUsers(days?: number, limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: any[] }>(`/api/admin/stats/active-users?${params}`);
    return response.data.data;
  },

  /** 内容分布 */
  async getContentDistribution(): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>('/api/admin/stats/content-distribution');
    return response.data.data;
  },

  /** AI 概览 */
  async getAiOverview(): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>('/api/admin/stats/ai-overview');
    return response.data.data;
  },

  /** 投票概览 */
  async getVoteOverview(): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>('/api/admin/stats/vote-overview');
    return response.data.data;
  },

  // ── 用户管理 ──

  /** 获取用户列表 */
  async getUsers(params: PaginationParams & { search?: string }): Promise<PaginatedResponse<AdminUser>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: PaginatedResponse<AdminUser> }>(`/api/users/admin/list?${query}`);
    return response.data.data;
  },

  /** 切换用户状态 */
  async toggleUserStatus(id: string): Promise<AdminUser> {
    const response = await api.patch<{ success: boolean; data: AdminUser }>(`/api/users/admin/${id}/status`);
    return response.data.data;
  },

  // ── 内容审核 ──

  /** 获取审核规则 */
  async getModerationRules(): Promise<AdminModerationRule[]> {
    const response = await api.get<{ success: boolean; data: AdminModerationRule[] }>('/api/moderation/rules');
    return response.data.data;
  },

  /** 创建审核规则 */
  async createModerationRule(data: Partial<AdminModerationRule>): Promise<AdminModerationRule> {
    const response = await api.post<{ success: boolean; data: AdminModerationRule }>('/api/moderation/rules', data);
    return response.data.data;
  },

  /** 获取审核记录 */
  async getModerationRecords(params?: { status?: string }): Promise<AdminModerationRecord[]> {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await api.get<{ success: boolean; data: AdminModerationRecord[] }>(`/api/moderation/records?${query}`);
    return response.data.data;
  },

  /** 更新审核记录 */
  async updateModerationRecord(id: string, data: Partial<AdminModerationRecord>): Promise<void> {
    await api.patch(`/api/moderation/records/${id}`, data);
  },

  // ── 系统配置 ──

  /** 获取系统配置 */
  async getSystemConfig(): Promise<AdminSystemConfig[]> {
    const response = await api.get<{ success: boolean; data: AdminSystemConfig[] }>('/api/security/config');
    return response.data.data;
  },

  /** 设置系统配置 */
  async setSystemConfig(config: Record<string, string>): Promise<void> {
    await api.post('/api/security/config', config);
  },

  // ── 审计日志 ──

  /** 获取审计日志 */
  async getAuditLogs(params: PaginationParams): Promise<PaginatedResponse<AdminAuditLog>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: PaginatedResponse<AdminAuditLog> }>(`/api/audit?${query}`);
    return response.data.data;
  },

  /** 获取 LLM 调用日志 */
  async getLlmLogs(params: PaginationParams): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: PaginatedResponse<any> }>(`/api/admin/llm-logs?${query}`);
    return response.data.data;
  },

  // ── 公告 ──

  /** 获取公告列表 */
  async getAnnouncements(): Promise<any[]> {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/rankings/announcements');
    return response.data.data;
  },

  /** 创建公告 */
  async createAnnouncement(data: any): Promise<any> {
    const response = await api.post<{ success: boolean; data: any }>('/api/rankings/announcements', data);
    return response.data.data;
  },

  /** 删除公告 */
  async deleteAnnouncement(id: string): Promise<void> {
    await api.delete(`/api/rankings/announcements/${id}`);
  },

  // ── 运营管理 ──

  /** 获取活动列表 */
  async getCampaigns(): Promise<any[]> {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/campaigns');
    return response.data.data;
  },

  /** 获取商品列表 */
  async getProducts(): Promise<any[]> {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/shop/products');
    return response.data.data;
  },

  // ── 安全管理 ──

  /** 获取 IP 黑名单 */
  async getIpBlacklist(): Promise<any[]> {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/security/ip-blacklist');
    return response.data.data;
  },

  /** 添加 IP 黑名单 */
  async addIpBlacklist(data: { ip: string; reason: string }): Promise<void> {
    await api.post('/api/security/ip-blacklist', data);
  },

  /** 移除 IP 黑名单 */
  async removeIpBlacklist(id: string): Promise<void> {
    await api.delete(`/api/security/ip-blacklist/${id}`);
  },

  /** 获取风险评估列表 */
  async getRiskAssessments(): Promise<any[]> {
    const response = await api.get<{ success: boolean; data: any[] }>('/api/security/risk-assessments');
    return response.data.data;
  },
};
