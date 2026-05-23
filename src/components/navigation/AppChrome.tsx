"use client";

import { usePathname } from "next/navigation";
import { AdSlot } from "@/components/monetization/AdSlot";
import { AppLayout } from "@/components/layout/AppLayout";
import { SkipLink } from "@/components/ui/SkipLink";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { HeadlinesMiniPlayer } from "@/components/listen/HeadlinesMiniPlayer";
import { HeadlinesListenProvider } from "@/providers/HeadlinesListenProvider";
import { NavigationProvider } from "@/providers/NavigationProvider";
import { NavProgress } from "./NavProgress";
import { NativeTouchLayer } from "@/components/mobile/NativeTouchLayer";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { ScrollRetention } from "@/components/mobile/ScrollRetention";
import { AppHydration } from "./AppHydration";
import { RouteTransition } from "./RouteTransition";

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

  if (pathname === "/shorts") {
    return <>{children}</>;
  }

  return (
    <HeadlinesListenProvider>
      <NavigationProvider>
        <NativeTouchLayer>
          <div className="app-shell has-bottom-nav" data-hydrated="false">
            <AppHydration />
            <SkipLink />
            <NavProgress />
            <LanguageGate />
            <div className="pl-hide-mobile">
              <div className="pl-container">
                <AdSlot slotId="global_header" />
              </div>
            </div>
            <AppLayout>
              <PullToRefresh>
                <ScrollRetention>
                  <RouteTransition>{children}</RouteTransition>
                </ScrollRetention>
              </PullToRefresh>
            </AppLayout>
            <HeadlinesMiniPlayer />
          </div>
        </NativeTouchLayer>
      </NavigationProvider>
    </HeadlinesListenProvider>
  );
}
