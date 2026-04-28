import api from "@/lib/api";
import type { LoginDto, RegisterDto, AuthResponse, User } from "./types";

export const authApi = {
  // 登录
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/auth/login", credentials);
    return response.data;
  },

  // 注册
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/auth/register", data);
    return response.data;
  },

  // 登出
  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },

  // 刷新 Token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/api/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/api/auth/me");
    return response.data;
  },
};
