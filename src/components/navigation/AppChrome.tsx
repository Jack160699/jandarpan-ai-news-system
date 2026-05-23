"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/monetization/AdSlot";
import { SkipLink } from "@/components/ui/SkipLink";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { HeadlinesMiniPlayer } from "@/components/listen/HeadlinesMiniPlayer";
import { HeadlinesListenProvider } from "@/providers/HeadlinesListenProvider";
import { NavigationProvider } from "@/providers/NavigationProvider";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { NavProgress } from "./NavProgress";
import { AppFab } from "@/components/mobile/AppFab";
import { NativeTouchLayer } from "@/components/mobile/NativeTouchLayer";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { ScrollRetention } from "@/components/mobile/ScrollRetention";
import { AppHydration } from "./AppHydration";
import { RouteTransition } from "./RouteTransition";

type AppChromeProps = {
  children: React.ReactNode;
};

const MINIMAL_CHROME_PREFIXES = ["/dashboard", "/admin"];
const FULLSCREEN_CHROME_PATHS = ["/shorts"];

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const minimal = MINIMAL_CHROME_PREFIXES.some((p) => pathname.startsWith(p));
  const reelsFullscreen =
    FULLSCREEN_CHROME_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    ) && pathname !== "/shorts"; /* allow /shorts with chrome if needed */

  if (minimal) {
    return <>{children}</>;
  }

  if (pathname === "/shorts") {
    return <>{children}</>;
  }

  return (
    <HeadlinesListenProvider>
      <NavigationProvider>
        <NativeTouchLayer>
          <div
            className="app-shell has-bottom-nav has-hl-mini flex min-h-dvh flex-col"
            data-hydrated="false"
          >
            <AppHydration />
            <SkipLink />
            <NavProgress />
            <LanguageGate />
            <div className="app-container rf-tablet-up">
              <AdSlot slotId="global_header" />
            </div>
            <AppHeader />
            <PullToRefresh>
              <ScrollRetention>
                <RouteTransition>{children}</RouteTransition>
              </ScrollRetention>
            </PullToRefresh>
            <AppFab />
            <HeadlinesMiniPlayer />
            <BottomNav />
          </div>
        </NativeTouchLayer>
      </NavigationProvider>
    </HeadlinesListenProvider>
  );
}
