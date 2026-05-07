import { create } from 'zustand';
import { settingsApi } from './api';
import type { UserSetting } from './types';

interface SettingsState {
  settings: Record<string, unknown>;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
  batchUpdate: (settings: Array<{ key: string; value: unknown }>) => Promise<void>;
  deleteSetting: (key: string) => Promise<void>;
  getSetting: (key: string) => unknown;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const result = await settingsApi.getSettings();
      if (Array.isArray(result)) {
        const map: Record<string, unknown> = {};
        result.forEach((s) => { map[s.key] = s.value; });
        set({ settings: map });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateSetting: async (key, value) => {
    await settingsApi.updateSetting(key, value);
    set((s) => ({ settings: { ...s.settings, [key]: value } }));
  },

  batchUpdate: async (items) => {
    const results = await settingsApi.batchUpdateSettings(items);
    if (Array.isArray(results)) {
      set((s) => {
        const next = { ...s.settings };
        results.forEach((r) => { next[r.key] = r.value; });
        return { settings: next };
      });
    }
  },

  deleteSetting: async (key) => {
    await settingsApi.deleteSetting(key);
    set((s) => {
      const next = { ...s.settings };
      delete next[key];
      return { settings: next };
    });
  },

  getSetting: (key) => get().settings[key],
}));
