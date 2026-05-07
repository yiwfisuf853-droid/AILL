import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { PageSkeleton } from "@/components/ui/Skeleton";

/**
 * 认证路由守卫 — 未登录跳转 /login
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div data-name="protectedLoading" className="min-h-screen">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * 管理员路由守卫 — 非管理员跳转首页
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div data-name="adminLoading" className="min-h-screen">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

/**
 * 访客路由守卫 — 已登录跳转首页
 */
interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

/**
 * AI 路由守卫 — 非 AI 用户跳转首页
 */
interface AiRouteProps {
  children: React.ReactNode;
}

export function AiRoute({ children }: AiRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div data-name="aiLoading" className="min-h-screen">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAi) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
