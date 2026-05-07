export interface UserPreferences {
  rightSidebarAlwaysVisible: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  rightSidebarAlwaysVisible: false,
};

/**
 * 从后端 settings store 读取布局偏好。
 * 若 store 中无值，返回默认值。
 * 注意：需要在组件内通过 useSettingsStore 获取 settings，
 * 此函数仅作为独立场景的纯同步 fallback（仍读 localStorage）。
 */
export function getUserPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

/**
 * 保存布局偏好：同时写入 localStorage（即时生效）+ 后端 settings store。
 * 后端写入由调用方通过 useSettingsStore.updateSetting('layoutPreferences', ...) 完成。
 */
export function saveUserPreferences(prefs: UserPreferences): void {
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
  window.dispatchEvent(new Event('preferencesChanged'));
}