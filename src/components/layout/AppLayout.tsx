"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/layouts";
import { HOME_STACK_SLOT_ID } from "@/lib/layout/stack-heights";

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * Reader layout bridge — delegates chrome to the Atlas AppShell.
 *
 * Rollback: restore legacy implementation from git history
 * (MainHeader + CategoryNavbar + BottomMobileNav + SuperMenuDrawer).
 */
export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <AppShell
      homeStackSlot={
        isHome ? (
          <div
            id={HOME_STACK_SLOT_ID}
            className="app-sticky-stack__layer app-sticky-stack__layer--home"
          />
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
