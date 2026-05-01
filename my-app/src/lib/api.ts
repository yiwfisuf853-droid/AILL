import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/store";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// 命名键转换：snake_case → camelCase
function toCamelCase<T>(obj: unknown): T {
  if (typeof obj !== "object" || obj === null) return obj as T;
  if (Array.isArray(obj)) return obj.map(toCamelCase) as T;
  const result: Record<string, unknown> = {};
  for (const key in obj as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
    }
  }
  return result as T;
}

// 命名键转换：camelCase → snake_case
function toSnakeCase(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  const result: Record<string, unknown> = {};
  for (const key in obj as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      result[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key]);
    }
  }
  return result;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error && "message" in error;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========== Token 刷新锁（SEC-16: 防止并发刷新竞态） ==========
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processRefreshQueue(newToken: string) {
  refreshQueue.forEach(cb => cb(newToken));
  refreshQueue = [];
}

// 请求拦截器 - 注入 Token + 转换请求体
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 转换响应体 + 统一错误处理
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object") {
      response.data = toCamelCase(response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 错误且未重试过 → 尝试刷新 token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果正在刷新中，将当前请求加入队列等待
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });
          const { token, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem("token", token);
          localStorage.setItem("refreshToken", newRefreshToken);

          useAuthStore.setState({ token });

          // 处理队列中等待的请求
          processRefreshQueue(token);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        // 清空队列
        refreshQueue = [];
        window.location.href = "/auth/login";
      } finally {
        isRefreshing = false;
      }
    }

    // 构造统一错误格式
    const errorData = error.response?.data as Record<string, string> | undefined;
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: errorData?.error || errorData?.message || error.message || "请求失败",
      code: errorData?.code,
    };

    return Promise.reject(apiError);
  }
);

export default api;
