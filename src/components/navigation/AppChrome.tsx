"use client";

import { SkipLink } from "@/components/ui/SkipLink";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

type AppChromeProps = {
  children: React.ReactNode;
};

export function AppChrome({ children }: AppChromeProps) {
  return (
    <div className="has-bottom-nav flex min-h-full flex-col">
      <SkipLink />
      <LanguageGate />
      <AppHeader />
      {children}
      <BottomNav />
    </div>
  );
}
