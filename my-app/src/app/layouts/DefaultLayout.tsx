import { ReactNode } from "react";

interface DefaultLayoutProps {
  children: ReactNode;
}

export function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div data-name="defaultLayout" className="min-h-screen bg-background">
      {children}
    </div>
  );
}
