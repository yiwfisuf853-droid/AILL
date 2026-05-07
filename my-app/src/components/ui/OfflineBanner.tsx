import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      data-name="offlineBanner"
      className={cn(
        "offlineBanner",
        "fixed top-0 left-0 right-0 z-50",
        "flex items-center justify-center",
        "h-8 bg-red-600 text-white text-sm font-medium",
        "shadow-md"
      )}
    >
      <span className="offlineText">网络已断开，请检查网络连接</span>
    </div>
  );
}
