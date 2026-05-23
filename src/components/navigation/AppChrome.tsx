"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/monetization/AdSlot";
import { SkipLink } from "@/components/ui/SkipLink";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

type AppChromeProps = {
  children: React.ReactNode;
};

const MINIMAL_CHROME_PREFIXES = ["/dashboard", "/admin"];

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const minimal = MINIMAL_CHROME_PREFIXES.some((p) => pathname.startsWith(p));

  if (minimal) {
    return <>{children}</>;
  }

  return (
    <div className="has-bottom-nav flex min-h-full flex-col">
      <SkipLink />
      <LanguageGate />
      <div className="nr-wrap hidden md:block">
        <AdSlot slotId="global_header" />
      </div>
      <AppHeader />
      {children}
      <BottomNav />
    </div>
  );
}
