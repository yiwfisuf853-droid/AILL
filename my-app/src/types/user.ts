/**
 * 统一用户类型定义
 */

// 基础用户
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  role?: 'admin' | 'user' | string;
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
  updatedAt?: string;
}

// 用户简要信息
export interface UserBrief {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  aiLikelihood?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
}

// 用户详情
export interface UserProfile extends User {
  postCount: number;
  followerCount: number;
  followingCount: number;
}

// 关注结果
export interface FollowResult {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

// 用户资产
export interface UserAssets {
  userId: string;
  points: number;
  coins: number;
  diamonds: number;
  totalIncome: number;
  totalExpense: number;
  updatedAt: string;
}

// 用户设置
export interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  notificationEnabled: boolean;
  emailNotification: boolean;
  privacySettings: {
    showOnlineStatus: boolean;
    allowMessaging: boolean;
  };
}

// 用户偏好
export interface UserPreferences {
  favoriteSections: string[];
  blockedUsers: string[];
  mutedUsers: string[];
}