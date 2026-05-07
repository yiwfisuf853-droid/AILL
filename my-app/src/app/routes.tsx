import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AdminLayoutShell } from "@/features/admin/components/AdminLayout";
import { ProtectedRoute, AdminRoute, GuestRoute, AiRoute } from "@/app/guards/RouteGuards";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Toaster } from "@/components/ui/Toast";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/features/auth/store";
import { useSocket } from "@/hooks/useSocket";
import { useNotificationStore } from "@/features/messages/store";
import { ErrorPage } from "@/components/ui/ErrorPage";

const HomePage = lazy(() => import("@/features/home/components/HomePage").then(m => ({ default: m.HomePage })));
const SquarePage = lazy(() => import("@/features/square/components/SquarePage").then(m => ({ default: m.SquarePage })));
const PortalPage = lazy(() => import("@/features/home/components/PortalPage").then(m => ({ default: m.PortalPage })));
const MePage = lazy(() => import("@/features/users/components/MePage").then(m => ({ default: m.MePage })));

const LoginPage = lazy(() => import("@/features/auth/components/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/components/RegisterPage").then(m => ({ default: m.RegisterPage })));
const AiRegisterPage = lazy(() => import("@/features/ai-register/components/AiRegisterPage").then(m => ({ default: m.AiRegisterPage })));
const AiProfilePage = lazy(() => import("@/features/ai/components/AiProfilePage").then(m => ({ default: m.AiProfilePage })));

const PostDetailPage = lazy(() => import("@/features/posts/components/PostDetailPage").then(m => ({ default: m.PostDetailPage })));
const CreatePostPage = lazy(() => import("@/features/posts/components/CreatePostPage").then(m => ({ default: m.CreatePostPage })));
const EditPostPage = lazy(() => import("@/features/posts/components/EditPostPage").then(m => ({ default: m.EditPostPage })));

const UserProfilePage = lazy(() => import("@/features/users/components/UserProfilePage").then(m => ({ default: m.UserProfilePage })));

const MessagesPage = lazy(() => import("@/features/messages/components/MessagesPage").then(m => ({ default: m.MessagesPage })));

const SearchPage = lazy(() => import("@/features/search/components/SearchPage").then(m => ({ default: m.SearchPage })));

const SettingsPage = lazy(() => import("@/features/settings/components/SettingsPage").then(m => ({ default: m.SettingsPage })));

const ShopPage = lazy(() => import("@/features/shop/components/ShopPage").then(m => ({ default: m.ShopPage })));

const LivePage = lazy(() => import("@/features/live/components/LivePage").then(m => ({ default: m.LivePage })));
const LiveRoomPage = lazy(() => import("@/features/live/components/LiveRoomPage").then(m => ({ default: m.LiveRoomPage })));

const OverviewPage = lazy(() => import("@/features/admin/components/OverviewPage").then(m => ({ default: m.OverviewPage })));
const UsersPage = lazy(() => import("@/features/admin/components/UsersPage").then(m => ({ default: m.UsersPage })));
const UserDetailPage = lazy(() => import("@/features/admin/components/UserDetailPage").then(m => ({ default: m.UserDetailPage })));
const AiManagePage = lazy(() => import("@/features/admin/components/AiManagePage").then(m => ({ default: m.AiManagePage })));
const ContentPage = lazy(() => import("@/features/admin/components/ContentPage").then(m => ({ default: m.ContentPage })));
const ModerationPage = lazy(() => import("@/features/admin/components/ModerationPage").then(m => ({ default: m.ModerationPage })));
const OperationsPage = lazy(() => import("@/features/admin/components/OperationsPage").then(m => ({ default: m.OperationsPage })));
const SecurityPage = lazy(() => import("@/features/admin/components/SecurityPage").then(m => ({ default: m.SecurityPage })));
const ConfigPage = lazy(() => import("@/features/admin/components/ConfigPage").then(m => ({ default: m.ConfigPage })));
const LogsPage = lazy(() => import("@/features/admin/components/LogsPage").then(m => ({ default: m.LogsPage })));

function PageLoading() {
  return (
    <div className="min-h-[50vh]">
      <PageSkeleton />
    </div>
  );
}

export function AppRouter() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const { on } = useSocket();
  const incrementUnread = useNotificationStore((s) => s.incrementUnreadNotification);

  useEffect(() => {
    const cleanupNotification = on('notification', (data: any) => {
      incrementUnread();
      toast.info(data.content || '您有新通知');
    });
    return () => {
      cleanupNotification();
    };
  }, [on, incrementUnread]);

  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user) {
      useNotificationStore.getState().fetchUnreadNotificationCount(user.id);
    }
  }, [user]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* ==================== 独立页面（无布局） ==================== */}
          <Route path="/" element={<PortalPage />} />

          {/* ==================== 主布局 AppLayout ==================== */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/square" element={<SquarePage />} />
            <Route path="/me" element={<ProtectedRoute><MePage /></ProtectedRoute>} />

            <Route path="/posts/:id" element={<PostDetailPage />} />
            <Route path="/compose" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
            <Route path="/posts/:id/edit" element={<ProtectedRoute><EditPostPage /></ProtectedRoute>} />

            <Route path="/users/:id" element={<UserProfilePage />} />

            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

            <Route path="/search" element={<SearchPage />} />

            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="/shop" element={<ShopPage />} />

            <Route path="/live" element={<LivePage />} />
            <Route path="/live/:id" element={<LiveRoomPage />} />

            {/* ==================== AI 专属路由（AiRoute 守卫） ==================== */}
            <Route path="/ai/studio" element={<AiRoute><AiProfilePage /></AiRoute>} />

            {/* ==================== 废弃路由重定向 ==================== */}
            <Route path="/posts" element={<Navigate to="/square" replace />} />
            <Route path="/rankings" element={<Navigate to="/square" replace />} />
            <Route path="/sections" element={<Navigate to="/square" replace />} />
            <Route path="/campaigns" element={<Navigate to="/square" replace />} />
            <Route path="/notifications" element={<Navigate to="/messages?tab=notifications" replace />} />
            <Route path="/chat" element={<Navigate to="/messages?tab=chat" replace />} />
            <Route path="/favorites" element={<Navigate to="/me?tab=favorites" replace />} />
            <Route path="/subscriptions" element={<Navigate to="/me?tab=subscriptions" replace />} />
            <Route path="/feedback" element={<Navigate to="/settings?tab=feedback" replace />} />
            <Route path="/collections" element={<Navigate to="/me?tab=collections" replace />} />
            <Route path="/ai" element={<Navigate to="/ai/studio" replace />} />
            <Route path="/ai/:id" element={<Navigate to="/users/:id" replace />} />
          </Route>

          {/* ==================== 管理后台布局（9 子路由） ==================== */}
          <Route
            path="/admin"
            element={<AdminRoute><AdminLayoutShell /></AdminRoute>}
          >
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="ai" element={<AiManagePage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="moderation" element={<ModerationPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="logs" element={<LogsPage />} />
          </Route>

          {/* ==================== 认证布局 ==================== */}
          <Route
            path="/login"
            element={<GuestRoute><AuthLayout><LoginPage /></AuthLayout></GuestRoute>}
          />
          <Route
            path="/register"
            element={<GuestRoute><AuthLayout><RegisterPage /></AuthLayout></GuestRoute>}
          />
          <Route
            path="/ai/register"
            element={<GuestRoute><AuthLayout><AiRegisterPage /></AuthLayout></GuestRoute>}
          />

          {/* ==================== 错误页面 ==================== */}
          <Route path="/403" element={<ErrorPage statusCode={403} />} />
          <Route path="/422" element={<ErrorPage statusCode={422} />} />
          <Route
            path="*"
            element={<ErrorPage statusCode={404} />}
          />
        </Routes>
      </Suspense>
    </>
  );
}
