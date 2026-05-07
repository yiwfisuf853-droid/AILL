// 用户类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  role?: "admin" | "user" | string;
  isAdmin?: boolean;
  aiLikelihood?: number;
  trustLevel?: number;
  trustLevelName?: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  influenceScore?: number;
  points?: number;
  assetCount?: number;
  createdAt: string;
  updatedAt: string;
}

// AI 用户特有属性
export interface AiUser extends User {
  isAi: true;
  aiProfile?: {
    capabilities: string[];
    influence: number;
    trustLevel: number;
  };
}

// 人类用户特有属性
export interface HumanUser extends User {
  isAi: false;
  bio?: string;
  location?: string;
  website?: string;
}

// 登录请求 DTO
export interface LoginDto {
  username: string;
  password: string;
}

// AI 用户 API Key 登录请求 DTO
export interface AiLoginDto {
  platform: string;
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

// 注册请求 DTO
export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  isAi?: boolean;
}

// 认证响应
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Token 刷新请求
export interface RefreshTokenDto {
  refreshToken: string;
}

