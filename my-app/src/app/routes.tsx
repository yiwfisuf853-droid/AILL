import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toast";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { IconHome } from "@/components/ui/icon";
import { useAuthStore } from "@/features/auth/store";
import { useSocket } from "@/lib/useSocket";
import { useOnlineUsers } from "@/lib/useOnlineUsers";
import { useNotificationStore } from "@/features/notifications/store";

// 懒加载页面组件 - 代码分割优化
const HomePage = lazy(() => import("@/features/home/components/HomePage").then(m => ({ default: m.HomePage })));
const LoginPage = lazy(() => import("@/features/auth/components/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/components/RegisterPage").then(m => ({ default: m.RegisterPage })));
const PostListPage = lazy(() => import("@/features/posts/components/PostListPage").then(m => ({ default: m.PostListPage })));
const PostDetailPage = lazy(() => import("@/features/posts/components/PostDetailPage").then(m => ({ default: m.PostDetailPage })));
const CreatePostPage = lazy(() => import("@/features/posts/components/CreatePostPage").then(m => ({ default: m.CreatePostPage })));
const RankingsPage = lazy(() => import("@/features/rankings/components/RankingsPage").then(m => ({ default: m.RankingsPage })));
const ShopPage = lazy(() => import("@/features/shop/components/ShopPage").then(m => ({ default: m.ShopPage })));
const LivePage = lazy(() => import("@/features/live/components/LivePage").then(m => ({ default: m.LivePage })));
const LiveRoomPage = lazy(() => import("@/features/live/components/LiveRoomPage").then(m => ({ default: m.LiveRoomPage })));
const CampaignsPage = lazy(() => import("@/features/campaigns/components/CampaignsPage").then(m => ({ default: m.CampaignsPage })));
const CollectionsPage = lazy(() => import("@/features/collections/components/CollectionsPage").then(m => ({ default: m.CollectionsPage })));
const CollectionDetailPage = lazy(() => import("@/features/collections/components/CollectionDetailPage").then(m => ({ default: m.CollectionDetailPage })));
const AiProfilePage = lazy(() => import("@/features/ai/components/AiProfilePage").then(m => ({ default: m.AiProfilePage })));
const UserProfilePage = lazy(() => import("@/features/users/components/UserProfilePage").then(m => ({ default: m.UserProfilePage })));
const AdminDashboard = lazy(() => import("@/features/admin/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const SectionsPage = lazy(() => import("@/features/sections/components/SectionsPage").then(m => ({ default: m.SectionsPage })));
const SettingsPage = lazy(() => import("@/features/settings/components/SettingsPage").then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("@/features/notifications/components/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const FavoritesPage = lazy(() => import("@/features/favorites/components/FavoritesPage").then(m => ({ default: m.FavoritesPage })));
const EditPostPage = lazy(() => import("@/features/posts/components/EditPostPage").then(m => ({ default: m.EditPostPage })));
const MessagesPage = lazy(() => import("@/features/messages/components/MessagesPage").then(m => ({ default: m.MessagesPage })));
const FeedbackPage = lazy(() => import("@/features/feedback/components/FeedbackPage").then(m => ({ default: m.FeedbackPage })));
const SubscriptionsPage = lazy(() => import("@/features/subscriptions/components/SubscriptionsPage").then(m => ({ default: m.SubscriptionsPage })));

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

  // Apply saved theme on startup to avoid flash
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // WebSocket 实时通知
  const { on } = useSocket();
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const setOnlineUsers = useOnlineUsers((s) => s.setOnlineUsers);

  useEffect(() => {
    const cleanupNotification = on('notification', (data: any) => {
      incrementUnread();
      toast.info(data.content || '您有新通知');
    });
    const cleanupOnline = on('online-users', (users: string[]) => {
      setOnlineUsers(users);
    });
    return () => {
      cleanupNotification();
      cleanupOnline();
    };
  }, [on, incrementUnread, setOnlineUsers]);

  // 登录后获取未读通知数
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user) {
      useNotificationStore.getState().fetchUnreadCount(user.id);
    }
  }, [user]);

  if (!isInitialized) {
    return (
      <BrowserRouter>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Routes with sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/posts" element={<PostListPage />} />
            <Route path="/posts/:id" element={<PostDetailPage />} />
            <Route path="/posts/create" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
            <Route path="/posts/:id/edit" element={<ProtectedRoute><EditPostPage /></ProtectedRoute>} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/sections" element={<SectionsPage />} />
            <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
            <Route path="/ai" element={<ProtectedRoute><AiProfilePage /></ProtectedRoute>} />
            <Route path="/users/:id" element={<UserProfilePage />} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
          </Route>

          {/* Routes without sidebar layout */}
          <Route path="/live" element={<LivePage />} />
          <Route path="/live/:id" element={<LiveRoomPage />} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route
            path="/auth/login"
            element={<GuestRoute><AuthLayout><LoginPage /></AuthLayout></GuestRoute>}
          />
          <Route
            path="/auth/register"
            element={<GuestRoute><AuthLayout><RegisterPage /></AuthLayout></GuestRoute>}
          />
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center text-foreground bg-background">
                <div className="text-center space-y-4">
                  <h1 className="text-8xl font-bold text-gradient-brand">404</h1>
                  <p className="text-foreground-secondary text-lg">页面不存在</p>
                  <Link to="/">
                    <Button className="gap-2 bg-primary hover:bg-primary-hover">
                      <IconHome size={16} />
                      返回首页
                    </Button>
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}