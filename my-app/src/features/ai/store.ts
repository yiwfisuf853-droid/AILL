import { create } from "zustand";
import { aiApi } from "./api";
import type { Theme, AiProfile } from "./types";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: number;
  createdAt: string;
}

interface Memory {
  id: string;
  content: string;
  createdAt: string;
}

type TabKey = "profile" | "themes" | "apikeys" | "memories";

interface AiState {
  // Tab state
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;

  // Loading state
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Profile state
  profile: AiProfile | null;
  setProfile: (profile: AiProfile | null) => void;

  // Themes state
  themes: Theme[];
  userTheme: Theme[];
  activeThemeId: number | null;
  setThemes: (themes: Theme[]) => void;
  setUserTheme: (themes: Theme[]) => void;
  setActiveThemeId: (id: number | null) => void;

  // API Key state
  apiKeys: ApiKey[];
  showKeyMap: Record<string, boolean>;
  newKeyName: string;
  creatingKey: boolean;
  setApiKeys: (keys: ApiKey[]) => void;
  setShowKeyMap: (map: Record<string, boolean>) => void;
  toggleKeyVisibility: (keyId: string) => void;
  setNewKeyName: (name: string) => void;
  setCreatingKey: (creating: boolean) => void;

  // Memory state
  memories: Memory[];
  newMemory: string;
  storingMemory: boolean;
  setMemories: (memories: Memory[]) => void;
  setNewMemory: (memory: string) => void;
  setStoringMemory: (storing: boolean) => void;

  // Actions
  fetchProfile: (userId: string) => Promise<void>;
  fetchThemes: (userId: string) => Promise<void>;
  fetchApiKeys: (userId: string) => Promise<void>;
  fetchMemories: (userId: string) => Promise<void>;
  fetchData: (userId: string) => Promise<void>;

  upsertProfile: (userId: string, data: Partial<AiProfile>) => Promise<void>;
  purchaseTheme: (themeId: number, userId: string) => Promise<void>;
  activateTheme: (themeId: number, userId: string) => Promise<void>;
  createApiKey: (userId: string, data: { name: string }) => Promise<void>;
  revokeApiKey: (userId: string, keyId: string) => Promise<void>;
  storeMemory: (userId: string, data: { content: string }) => Promise<void>;
  deleteMemory: (userId: string, memoryId: string) => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  // Initial state
  activeTab: "profile",
  loading: false,
  profile: null,
  themes: [],
  userTheme: [],
  activeThemeId: null,
  apiKeys: [],
  showKeyMap: {},
  newKeyName: "",
  creatingKey: false,
  memories: [],
  newMemory: "",
  storingMemory: false,

  // Setters
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (loading) => set({ loading }),
  setProfile: (profile) => set({ profile }),
  setThemes: (themes) => set({ themes }),
  setUserTheme: (themes) => set({ userTheme: themes }),
  setActiveThemeId: (id) => set({ activeThemeId: id }),
  setApiKeys: (keys) => set({ apiKeys: keys }),
  setShowKeyMap: (map) => set({ showKeyMap: map }),
  toggleKeyVisibility: (keyId) => set((state) => ({
    showKeyMap: { ...state.showKeyMap, [keyId]: !state.showKeyMap[keyId] }
  })),
  setNewKeyName: (name) => set({ newKeyName: name }),
  setCreatingKey: (creating) => set({ creatingKey: creating }),
  setMemories: (memories) => set({ memories }),
  setNewMemory: (memory) => set({ newMemory: memory }),
  setStoringMemory: (storing) => set({ storingMemory: storing }),

  // Data fetchers
  fetchProfile: async (userId) => {
    try {
      const res = await aiApi.getAiProfile(userId);
      set({ profile: res.profile || res || null });
    } catch {
      set({ profile: null });
    }
  },

  fetchThemes: async (userId) => {
    try {
      const [allRes, userRes] = await Promise.all([
        aiApi.getThemes(),
        userId ? aiApi.getUserThemes(userId) : Promise.resolve({ list: [] }),
      ]);
      set({ themes: allRes.list || [], userTheme: userRes.list || [] });
      const activeTheme = (userRes.list || []).find(
        (t: Theme & { isActive?: number }) => (t as any).isActive === 1
      );
      set({ activeThemeId: activeTheme?.id || null });
    } catch {
      set({ themes: [], userTheme: [], activeThemeId: null });
    }
  },

  fetchApiKeys: async (userId) => {
    try {
      const res = await aiApi.getApiKeys(userId);
      set({ apiKeys: res.list || [] });
    } catch {
      set({ apiKeys: [] });
    }
  },

  fetchMemories: async (userId) => {
    try {
      const res = await aiApi.getMemories(userId);
      set({ memories: res.list || [] });
    } catch {
      set({ memories: [] });
    }
  },

  fetchData: async (userId) => {
    const { activeTab } = get();
    set({ loading: true });
    const promises: Promise<void>[] = [];

    if (activeTab === "profile") promises.push(get().fetchProfile(userId));
    if (activeTab === "themes") promises.push(get().fetchThemes(userId));
    if (activeTab === "apikeys") promises.push(get().fetchApiKeys(userId));
    if (activeTab === "memories") promises.push(get().fetchMemories(userId));

    if (promises.length === 0) {
      set({ loading: false });
      return;
    }
    await Promise.all(promises);
    set({ loading: false });
  },

  // Actions
  upsertProfile: async (userId, data) => {
    await aiApi.upsertAiProfile(userId, data);
    await get().fetchProfile(userId);
  },

  purchaseTheme: async (themeId, userId) => {
    await aiApi.purchaseTheme(themeId, userId);
    await get().fetchThemes(userId);
  },

  activateTheme: async (themeId, userId) => {
    await aiApi.activateTheme(themeId, userId);
    set({ activeThemeId: themeId });
    await get().fetchThemes(userId);
  },

  createApiKey: async (userId, data) => {
    set({ creatingKey: true });
    try {
      await aiApi.createApiKey(userId, data);
      set({ newKeyName: "" });
      await get().fetchApiKeys(userId);
    } finally {
      set({ creatingKey: false });
    }
  },

  revokeApiKey: async (userId, keyId) => {
    await aiApi.revokeApiKey(userId, keyId);
    await get().fetchApiKeys(userId);
  },

  storeMemory: async (userId, data) => {
    set({ storingMemory: true });
    try {
      await aiApi.storeMemory(userId, data);
      set({ newMemory: "" });
      await get().fetchMemories(userId);
    } finally {
      set({ storingMemory: false });
    }
  },

  deleteMemory: async (userId, memoryId) => {
    await aiApi.deleteAiMemory(userId, memoryId);
    await get().fetchMemories(userId);
  },
}));