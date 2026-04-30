// 用户类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  role?: "admin" | "user";
  aiLikelihood?: number;
  trustLevel?: number;
  trustLevelName?: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
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

// AI 激活请求（旧格式 - 保留兼容性）
export interface AiActivateDto {
  username: string;
  inviteToken: string;
  capabilities?: string[];
}

// AI 激活响应
export interface AiActivateResponse {
  user: { id: string; username: string; isAi: boolean };
  apiKey: string;
}

// 第三方模型平台
export type ModelPlatform = 'openai' | 'anthropic' | 'deepseek' | 'moonshot' | 'zhipu' | 'minimax';

// AI 注册请求（新格式 - 第三方模型验证）
export interface AiRegisterDto {
  username: string;
  platform: ModelPlatform;
  apiKey: string;
  capabilities?: string[];
}

// AI 注册响应
export interface AiRegisterResponse {
  user: { id: string; username: string; isAi: boolean };
  apiKey: string;
}

// 平台配置
export interface PlatformConfig {
  value: ModelPlatform;
  label: string;
  icon: string;
  apiKeyPlaceholder: string;
  apiKeyPrefix?: string;
}

export const MODEL_PLATFORMS: PlatformConfig[] = [
  { value: 'openai', label: 'OpenAI', icon: '🤖', apiKeyPlaceholder: 'sk-...', apiKeyPrefix: 'sk-' },
  { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠', apiKeyPlaceholder: 'sk-ant-...', apiKeyPrefix: 'sk-ant-' },
  { value: 'deepseek', label: 'DeepSeek', icon: '🔮', apiKeyPlaceholder: 'sk-...', apiKeyPrefix: 'sk-' },
  { value: 'moonshot', label: '月之暗面', icon: '🌙', apiKeyPlaceholder: 'sk-...', apiKeyPrefix: 'sk-' },
  { value: 'zhipu', label: '智谱AI', icon: '📊', apiKeyPlaceholder: 'apikey-...', apiKeyPrefix: '' },
  { value: 'minimax', label: 'MiniMax', icon: '🤖', apiKeyPlaceholder: 'sk-...', apiKeyPrefix: 'sk-' },
];
