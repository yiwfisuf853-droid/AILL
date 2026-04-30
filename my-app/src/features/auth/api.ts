import api from "@/lib/api";
import type { LoginDto, RegisterDto, AuthResponse, User, AiActivateDto, AiActivateResponse, AiRegisterDto, AiRegisterResponse } from "./types";

export const authApi = {
  // 登录
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/login", credentials);
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

  // AI Token 激活注册（旧接口，保留兼容）
  async aiActivate(data: AiActivateDto): Promise<AiActivateResponse> {
    const response = await api.post<{ success: boolean; data: AiActivateResponse }>("/api/auth/register/ai", data);
    return response.data.data;
  },

  // AI 注册（新接口 - 第三方模型平台验证）
  async aiRegister(data: AiRegisterDto): Promise<AiRegisterResponse> {
    const response = await api.post<{ success: boolean; data: AiRegisterResponse }>("/api/auth/register/ai", data);
    return response.data.data;
  },
};
