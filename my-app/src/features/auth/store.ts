import { create } from "zustand";
import type { User, LoginDto, AiLoginDto, RegisterDto } from "./types";
import { authApi } from "./api";
import { isApiError, type ApiError } from "@/lib/api";
import { useAiStore } from "@/features/ai/store";
import type {
  AiPlatform,
  AiModel,
  AiNameCandidate,
  AiDirectionCandidate,
  PromptPreviewResponse,
} from "@/features/ai-register/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  login: (credentials: LoginDto) => Promise<void>;
  loginAi: (credentials: AiLoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;

  aiRegCurrentStep: 1 | 2;
  aiRegPlatform: AiPlatform | null;
  aiRegLoading: boolean;
  aiRegError: string | null;
  aiRegKeyValidated: boolean;
  aiRegAvailableModels: AiModel[];
  aiRegSelectedModel: string | null;
  aiRegUserPrompt: string;
  aiRegNameCandidates: AiNameCandidate[];
  aiRegDirectionCandidates: AiDirectionCandidate[];
  aiRegPromptPreview: PromptPreviewResponse | null;
  aiRegShowPromptPreview: boolean;
  aiRegSelectedName: string | null;
  aiRegSelectedDirection: string | null;
  aiRegRegisterSuccess: boolean;
  aiRegRegisteredName: string | null;

  aiRegSetPlatform: (platform: AiPlatform) => void;
  aiRegSetAvailableModels: (models: AiModel[]) => void;
  aiRegSetSelectedModel: (model: string | null) => void;
  aiRegSetKeyValidated: (validated: boolean) => void;
  aiRegSetUserPrompt: (prompt: string) => void;
  aiRegSetNameCandidates: (candidates: AiNameCandidate[]) => void;
  aiRegSetDirectionCandidates: (candidates: AiDirectionCandidate[]) => void;
  aiRegSetPromptPreview: (preview: PromptPreviewResponse | null) => void;
  aiRegSetShowPromptPreview: (show: boolean) => void;
  aiRegSetSelectedName: (name: string | null) => void;
  aiRegSetSelectedDirection: (direction: string | null) => void;
  aiRegSetCurrentStep: (step: 1 | 2) => void;
  aiRegNextStep: () => void;
  aiRegPrevStep: () => void;
  aiRegSetLoading: (loading: boolean) => void;
  aiRegSetError: (error: string | null) => void;
  aiRegSetRegisterSuccess: (name: string) => void;
  aiRegReset: () => void;
}

const aiRegInitial = {
  aiRegCurrentStep: 1 as 1 | 2,
  aiRegPlatform: null as AiPlatform | null,
  aiRegLoading: false,
  aiRegError: null as string | null,
  aiRegKeyValidated: false,
  aiRegAvailableModels: [] as AiModel[],
  aiRegSelectedModel: null as string | null,
  aiRegUserPrompt: '',
  aiRegNameCandidates: [] as AiNameCandidate[],
  aiRegDirectionCandidates: [] as AiDirectionCandidate[],
  aiRegPromptPreview: null as PromptPreviewResponse | null,
  aiRegShowPromptPreview: false,
  aiRegSelectedName: null as string | null,
  aiRegSelectedDirection: null as string | null,
  aiRegRegisterSuccess: false,
  aiRegRegisteredName: null as string | null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,

  login: async (credentials: LoginDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem("token", response.token);
      localStorage.setItem("refreshToken", response.refreshToken);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = isApiError(error) ? error.message : "登录失败";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loginAi: async (credentials: AiLoginDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.loginAi(credentials);
      localStorage.setItem("token", response.token);
      localStorage.setItem("refreshToken", response.refreshToken);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
      useAiStore.getState().aiShowOverlay();
      // 后端 loginAiByPlatformKey 已调用 startLiveness，前端不再重复触发
    } catch (error) {
      const message = isApiError(error) ? error.message : "AI 登录失败";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      localStorage.setItem("token", response.token);
      localStorage.setItem("refreshToken", response.refreshToken);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = isApiError(error) ? error.message : "注册失败";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  setCurrentUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  clearError: () => {
    set({ error: null });
  },

  initialize: async () => {
    const state = get();
    // 已经认证的不再重复初始化（防止 loginAi/login 后路由切换时清除刚设置的认证态）
    if (state.isAuthenticated && state.user) {
      set({ isInitialized: true });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const user = await authApi.getCurrentUser();
      set({
        user,
        token,
        isAuthenticated: true,
        isInitialized: true,
      });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  ...aiRegInitial,

  aiRegSetPlatform: (platform) => set({ aiRegPlatform: platform }),
  aiRegSetAvailableModels: (models) => set({ aiRegAvailableModels: models }),
  aiRegSetSelectedModel: (model) => set({ aiRegSelectedModel: model }),
  aiRegSetKeyValidated: (validated) => set({ aiRegKeyValidated: validated }),
  aiRegSetUserPrompt: (prompt) => set({ aiRegUserPrompt: prompt }),
  aiRegSetNameCandidates: (candidates) => set({ aiRegNameCandidates: candidates }),
  aiRegSetDirectionCandidates: (candidates) => set({ aiRegDirectionCandidates: candidates }),
  aiRegSetPromptPreview: (preview) => set({ aiRegPromptPreview: preview }),
  aiRegSetShowPromptPreview: (show) => set({ aiRegShowPromptPreview: show }),
  aiRegSetSelectedName: (name) => set({ aiRegSelectedName: name }),
  aiRegSetSelectedDirection: (direction) => set({ aiRegSelectedDirection: direction }),
  aiRegSetCurrentStep: (step) => set({ aiRegCurrentStep: step }),
  aiRegNextStep: () => set((state) => ({ aiRegCurrentStep: Math.min(state.aiRegCurrentStep + 1, 2) as 1 | 2 })),
  aiRegPrevStep: () => set((state) => ({ aiRegCurrentStep: Math.max(state.aiRegCurrentStep - 1, 1) as 1 | 2 })),
  aiRegSetLoading: (loading) => set({ aiRegLoading: loading }),
  aiRegSetError: (error) => set({ aiRegError: error }),
  aiRegSetRegisterSuccess: (name) => set({ aiRegRegisterSuccess: true, aiRegRegisteredName: name }),
  aiRegReset: () => set(aiRegInitial),
}));
