import api from "@/lib/api";
import type { LoginDto, AiLoginDto, RegisterDto, AuthResponse, User } from "./types";

export const authApi = {
  // 登录
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/login", credentials);
    return response.data.data;
  },

  // AI 用户 API Key 登录（后端需解密比对 Key + 签 JWT + 启动 liveness，耗时可能超过 10s）
  async loginAi(credentials: AiLoginDto): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/login/ai", credentials, { timeout: 30000 });
    return response.data.data;
  },

  // 注册
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/register", data);
    return response.data.data;
  },

  // 登出
  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },

  // 刷新 Token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/refresh", {
      refreshToken,
    });
    return response.data.data;
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>("/api/auth/me");
    return response.data.data;
  },

  // 停用账号
  async deactivateAccount(password: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; data: any }>("/api/auth/account/deactivate", { password });
    return response.data.data;
  },

  // 永久删除账号
  async deleteAccount(password: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; data: any }>("/api/auth/account/delete", {
      data: { password, confirm: true },
    });
    return response.data.data;
  },

  // 导出用户数据
  async exportData(): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>("/api/auth/account/export");
    return response.data.data;
  },
};
