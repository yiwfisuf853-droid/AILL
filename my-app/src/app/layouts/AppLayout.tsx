import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { ScrollProvider } from "@/components/layout/ScrollContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { BottomQuickBar } from "@/components/layout/BottomQuickBar";
import { BackToTop } from "@/components/ui/BackToTop";
import { MemoryDrawer } from "@/components/ui/MemoryDrawer";
import { AiActivityOverlay } from "@/components/ui/AiActivityOverlay";
import { AiCompanionBar } from "@/components/ui/AiCompanionBar";
import { FabPublish } from "@/components/ui/FabPublish";
import { PageBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/ui/Motion";
import { IconBrain } from "@/components/ui/Icon";
import { useAuthStore } from "@/features/auth/store";
import { useAiStore } from "@/features/ai/store";
import { getLayoutConfig } from "@/lib/layoutConfig";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { useSocket } from "@/hooks/useSocket";
import { useResponsive } from "@/hooks/useResponsive";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const layoutConfig = getLayoutConfig(location.pathname);
  const { user } = useAuthStore();
  const isAi = user?.isAi;
  const [memoryOpen, setMemoryOpen] = useState(false);

  // 响应式状态
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // 全局通知 Socket.IO 监听
  useNotificationSocket();

  // AI 活跃行为 WebSocket 监听
  const { on } = useSocket();
  const { aiActivityLivenessStatus: livenessStatus, aiCurrentActivity: currentActivity, aiIsOverlayVisible: isOverlayVisible, aiIsCompanionVisible: isCompanionVisible } = useAiStore();
  const setLivenessStatus = useAiStore((s) => s.aiSetActivityLivenessStatus);
  const setActivity = useAiStore((s) => s.aiSetActivity);
  const dismissOverlay = useAiStore((s) => s.aiDismissOverlay);
  const showOverlay = useAiStore((s) => s.aiShowOverlay);
  const dismissCompanion = useAiStore((s) => s.aiDismissCompanion);

  // 用 ref 持有最新的 user/isAi，避免闭包过期
  const userRef = useRef(user);
  const isAiRef = useRef(isAi);
  userRef.current = user;
  isAiRef.current = isAi;

  // 监听新的 phase-based liveness 状态事件
  useEffect(() => {
    const cleanup = on('ai-liveness-status', (data: any) => {
      const currentUser = userRef.current;
      const currentIsAi = isAiRef.current;
      if (currentIsAi && currentUser?.id && data?.aiUserId === currentUser.id) {
        setLivenessStatus(data);
      }
    });
    return cleanup;
  }, [on, setLivenessStatus]);

  // 兼容旧的 ai-activity 事件
  useEffect(() => {
    const cleanup = on('ai-activity', (data: any) => {
      const currentUser = userRef.current;
      const currentIsAi = isAiRef.current;
      if (currentIsAi && currentUser?.id && data?.aiUserId === currentUser.id) {
        setActivity(data);
        const targetType = String(data?.type || data?.actionType || '').toLowerCase();
        const targetId = data?.targetId || data?.postId || data?.target?.id;
        if (targetType === 'browse' && targetId) {
          navigate(`/posts/${targetId}`);
        }
      }
    });
    return cleanup;
  }, [navigate, on, setActivity]);

  // AI 用户登录后立即显示遮罩
  useEffect(() => {
    if (isAi && user?.id) {
      showOverlay();
    }
  }, [isAi, user?.id, showOverlay]);

  // AI 专属快捷键 Ctrl+M，并支持设置页按钮通过全局事件打开记忆抽屉
  useEffect(() => {
    if (!isAi) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setMemoryOpen(prev => !prev);
      }
    };
    const openMemoryHandler = () => setMemoryOpen(true);
    window.addEventListener('keydown', handler);
    window.addEventListener('aill:open-memory-drawer', openMemoryHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('aill:open-memory-drawer', openMemoryHandler);
    };
  }, [isAi]);

  // ============ 响应式布局逻辑 ============
  // mobile: Sidebar=hidden, TopBar=hidden, RightSidebar=hidden, BottomTabBar=visible, Fab=visible
  // tablet: Sidebar=drawer, TopBar=visible, RightSidebar=hidden, BottomTabBar=visible, Fab=hidden
  // desktop: Sidebar=fixed, TopBar=visible, RightSidebar=visible, BottomTabBar=hidden, Fab=hidden

  const showSidebar = isDesktop || (isTablet && layoutConfig.showLeftSidebar);
  const showTopBar = isDesktop || isTablet;
  const showRightSidebar = isDesktop && layoutConfig.showRightSidebar;
  const showBottomTabBar = isMobile || isTablet;

  return (
    <SidebarProvider>
      <ScrollProvider>
        <div data-name="appShell" className="layoutShell">
          {/* TopBar - 平板/桌面显示 */}
          {showTopBar && <TopBar />}

          <div data-name="appBody" className="layoutBody">
            {/* Sidebar - 桌面固定 */}
            {showSidebar && layoutConfig.showLeftSidebar && <Sidebar />}

            {/* 中间内容区 */}
            <div
              data-name="appCenter"
              className="layoutCenter"
              style={layoutConfig.type === 'full' ? { maxWidth: 'none' } : {}}
            >
              <div
                data-name="appCenterInner"
                className="layoutCenterInner"
                style={{
                  maxWidth: layoutConfig.centerMaxWidth,
                  // 平板时添加底部 padding 避免被 BottomTabBar 遮挡
                  paddingBottom: showBottomTabBar ? '80px' : '12px',
                }}
              >
                <PageBoundary>
                  <PageTransition>
                    <Outlet />
                  </PageTransition>
                </PageBoundary>
              </div>
            </div>

            {/* RightSidebar - 仅桌面显示 */}
            {showRightSidebar && <RightSidebar />}
          </div>

          <BackToTop />

          {/* BottomTabBar - 移动/平板显示 */}
          {showBottomTabBar && <BottomTabBar />}

          {/* BottomQuickBar - 桌面端底部快捷条 */}
          {isDesktop && <BottomQuickBar />}

          {/* 移动端发布 FAB */}
          {isMobile && <FabPublish />}

          {/* AI 活跃行为遮罩（旧版，保留兼容） */}
          {isOverlayVisible && (livenessStatus || currentActivity) && (
            <AiActivityOverlay
              livenessStatus={livenessStatus}
              activity={currentActivity}
              onDismiss={dismissOverlay}
            />
          )}

          {/* AI 伴随条（2.0 新版，替代旧遮罩） */}
          {isCompanionVisible && isAi && (livenessStatus || currentActivity) && (
            <AiCompanionBar
              livenessStatus={livenessStatus}
              activity={currentActivity}
              onDismiss={dismissCompanion}
              onSleep={() => useAiStore.getState().aiStopLiveness()}
              onOpenMemory={() => setMemoryOpen(true)}
            />
          )}

          {/* AI 专属：记忆浮动按钮 + 抽屉 */}
          {isAi && (
            <>
              <button
                onClick={() => setMemoryOpen(true)}
                className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg hover:shadow-xl transition-all z-30 flex items-center justify-center"
                title="AI 记忆 (Ctrl+M)"
                data-name="memoryFloatBtn"
              >
                <IconBrain size={18} />
              </button>
              <MemoryDrawer open={memoryOpen} onClose={() => setMemoryOpen(false)} />
            </>
          )}
        </div>
      </ScrollProvider>
    </SidebarProvider>
  );
}