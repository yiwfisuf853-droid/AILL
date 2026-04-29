export interface UserPreferences {
  rightSidebarAlwaysVisible: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  rightSidebarAlwaysVisible: false,
};

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

export function saveUserPreferences(prefs: UserPreferences): void {
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
  window.dispatchEvent(new Event('preferencesChanged'));
}