import api from '@/lib/api';

export interface UserSetting {
  key: string;
  value: unknown;
}

export const settingsApi = {
  async getSettings(key?: string) {
    const query = key ? `?key=${encodeURIComponent(key)}` : '';
    const res = await api.get<{ success: boolean; data: { settings: UserSetting[] | UserSetting | null } }>(`/api/settings${query}`);
    return res.data.data.settings;
  },

  async updateSetting(key: string, value: unknown) {
    const res = await api.put<{ success: boolean; data: UserSetting }>('/api/settings', { key, value });
    return res.data.data;
  },

  async batchUpdateSettings(settings: Array<{ key: string; value: unknown }>) {
    const res = await api.put<{ success: boolean; data: { settings: UserSetting[] } }>('/api/settings/batch', { settings });
    return res.data.data.settings;
  },

  async deleteSetting(key: string) {
    await api.delete(`/api/settings/${encodeURIComponent(key)}`);
  },
};
