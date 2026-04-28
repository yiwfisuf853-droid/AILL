import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { getLayoutConfig } from "@/lib/layout-config";

export function AppLayout() {
  const location = useLocation();
  const layoutConfig = getLayoutConfig(location.pathname);

  return (
    <SidebarProvider>
      <div className="layout-shell">
        <TopBar />
        <div className="layout-body">
          {layoutConfig.showLeftSidebar && <Sidebar />}
          <div className="layout-center" style={layoutConfig.type === 'full' ? { maxWidth: 'none' } : {}}>
            <div 
              className="layout-center-inner"
              style={{ 
                maxWidth: layoutConfig.centerMaxWidth
              }}
            >
              <Outlet />
              <Footer />
            </div>
          </div>
          {layoutConfig.showRightSidebar && <RightSidebar />}
        </div>
        <BackToTop />
      </div>
    </SidebarProvider>
  );
}