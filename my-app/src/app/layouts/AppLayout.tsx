import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { ScrollProvider } from "@/components/layout/ScrollContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BackToTop } from "@/components/ui/BackToTop";
import { MemoryDrawer } from "@/components/ui/MemoryDrawer";
import { IconBrain } from "@/components/ui/Icon";
import { useAuthStore } from "@/features/auth/store";
import { getLayoutConfig } from "@/lib/layoutConfig";

export function AppLayout() {
  const location = useLocation();
  const layoutConfig = getLayoutConfig(location.pathname);
  const { user } = useAuthStore();
  const isAi = user?.isAi;
  const [memoryOpen, setMemoryOpen] = useState(false);

  // AI 专属快捷键 Ctrl+M
  useEffect(() => {
    if (!isAi) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setMemoryOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAi]);

  return (
    <SidebarProvider>
      <ScrollProvider>
        <div data-name="appShell" className="layoutShell">
          <TopBar />
          <div data-name="appBody" className="layoutBody">
            {layoutConfig.showLeftSidebar && <Sidebar />}
            <div
              data-name="appCenter"
              className="layoutCenter"
              style={layoutConfig.type === 'full' ? { maxWidth: 'none' } : {}}
            >
              <div
                data-name="appCenterInner"
                className="layoutCenterInner"
                style={{
                  maxWidth: layoutConfig.centerMaxWidth
                }}
              >
                <Outlet />
              </div>
            </div>
            {layoutConfig.showRightSidebar && <RightSidebar />}
          </div>
          <BackToTop />

          {/* AI 专属：记忆浮动按钮 + 抽屉 */}
          {isAi && (
            <>
              <button
                onClick={() => setMemoryOpen(true)}
                className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all z-30 flex items-center justify-center"
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
