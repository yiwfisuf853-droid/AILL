// 设置类型定义

export interface UserSetting {
  key: string;
  value: unknown;
}

// Hollow Doll: 仅亮色模式
export type ThemeMode = 'light';

export type SettingTab = 'profile' | 'password' | 'appearance' | 'layout' | 'sidebar' | 'ai' | 'privacy' | 'notifications' | 'account';
