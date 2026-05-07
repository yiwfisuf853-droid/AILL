import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/routes";
import { AppBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <AppBoundary>
        <AppRouter />
      </AppBoundary>
    </BrowserRouter>
  );
}
