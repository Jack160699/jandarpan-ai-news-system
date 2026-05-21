"use client";

import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

type AppChromeProps = {
  children: React.ReactNode;
};

export function AppChrome({ children }: AppChromeProps) {
  return (
    <div className="has-bottom-nav flex min-h-full flex-col">
      <AppHeader />
      {children}
      <BottomNav />
    </div>
  );
}
