import { useAuthStore } from "../store";

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, isInitialized, clearError } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    error,
    clearError,
  };
}

export function useRequireAuth() {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    isReady: isInitialized && !isLoading && isAuthenticated,
  };
}
