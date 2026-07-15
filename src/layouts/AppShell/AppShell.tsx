"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { cn } from "@/design-system/utils/cn";
import { APP_STICKY_STACK_ID } from "@/lib/layout/stack-heights";
import { ShellProvider } from "./ShellProvider";
import { TopBar } from "../TopBar";
import { DesktopSidebar } from "../DesktopSidebar";
import { BottomNavigation } from "../BottomNavigation";
import { DistrictModal } from "../DistrictModal/DistrictModal";
import { CommandPalette } from "../CommandPalette";
import { isChromeHiddenRoute } from "../chrome-routes";
import type { AppShellProps } from "../types";

const SearchOverlay = dynamic(
  () =>
    import("../SearchOverlay/SearchOverlay").then((m) => ({
      default: m.SearchOverlay,
    })),
  { ssr: false, loading: () => null }
);

const SuperMenuDrawer = dynamic(
  () =>
    import("@/components/super-menu/SuperMenuDrawer").then((m) => ({
      default: m.SuperMenuDrawer,
    })),
  { ssr: false, loading: () => null }
);

/**
 * JDP-002 Application Shell
 *
 * Premium layout wrapper for all reader surfaces.
 * Preserves backward-compatible `.app-feed` slot for existing pages.
 */
export function AppShell({
  children,
  homeStackSlot,
  hideBottomNav,
}: AppShellProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const chromeHidden = isChromeHiddenRoute(pathname);
  const bottomHidden = chromeHidden || (hideBottomNav ?? false);

  return (
    <ShellProvider>
      <div className={cn("jdp-shell", bottomHidden && "jdp-shell--no-bottom-nav")}>
        <div className="jdp-shell__sidebar-region">
          {chromeHidden ? null : <DesktopSidebar />}
        </div>

        <div className="jdp-shell__body">
          {chromeHidden ? null : (
            <div
              id={APP_STICKY_STACK_ID}
              className="jdp-shell__sticky-stack app-sticky-stack"
              data-stack-mode={isHome ? "home" : "chrome"}
            >
              <div className="app-sticky-stack__layer app-sticky-stack__layer--header">
                <TopBar />
              </div>
              {homeStackSlot}
            </div>
          )}

          <div className="jdp-shell__feed app-feed">{children}</div>

          <BottomNavigation hidden={bottomHidden} />
        </div>
      </div>

      <CommandPalette />
      <SearchOverlay />
      <DistrictModal />
      <SuperMenuDrawer />
    </ShellProvider>
  );
}
