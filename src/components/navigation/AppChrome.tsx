"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdSlot } from "@/components/monetization/AdSlot";
import { AppLayout } from "@/components/layout/AppLayout";
import { SkipLink } from "@/components/ui/SkipLink";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/cn";
import { ArticleSpeechProvider } from "@/providers/ArticleSpeechProvider";
import { EditorialIntelligenceProvider } from "@/providers/EditorialIntelligenceProvider";
import { HeadlinesListenProvider } from "@/providers/HeadlinesListenProvider";
import { LiveProvider } from "@/providers/LiveProvider";
import { NavigationProvider } from "@/providers/NavigationProvider";
import { PlaceProvider } from "@/providers/PlaceProvider";
import { ReaderAccountProvider } from "@/providers/ReaderAccountProvider";
import { NavProgress } from "./NavProgress";
import { NativeTouchLayer } from "@/components/mobile/NativeTouchLayer";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { ScrollRetention } from "@/components/mobile/ScrollRetention";
import { RouteTransition } from "./RouteTransition";

const ContinueRibbon = dynamic(
  () =>
    import("@/components/editorial/ContinueRibbon").then((m) => ({
      default: m.ContinueRibbon,
    })),
  { ssr: false }
);

const TopTenAudioDock = dynamic(
  () =>
    import("@/components/listen/TopTenAudioDock").then((m) => ({
      default: m.TopTenAudioDock,
    })),
  { ssr: false }
);

const OnboardingExperienceV3 = dynamic(
  () =>
    import("@/features/onboarding-v3").then((m) => ({
      default: m.OnboardingExperienceV3,
    })),
  { ssr: false }
);

type AppChromeProps = {
  children: React.ReactNode;
};

const MINIMAL_CHROME_PREFIXES = ["/admin", "/design-system", "/component-library"];

function AppChromeShell({ children }: AppChromeProps) {
  const pathname = usePathname();
  const { contentLocked, mounted } = useLanguage();
  const isStory = pathname.startsWith("/story/");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "app-shell",
        !isStory && "has-bottom-nav",
        isStory && "app-shell--story",
        contentLocked && mounted && "app-shell--lang-locked"
      )}
      data-hydrated={hydrated ? "true" : "false"}
    >
      <SkipLink />
      <NavProgress />
      <LanguageGate />
      <OnboardingExperienceV3 />
      <div className="app-shell__content">
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
        <ContinueRibbon />
        <TopTenAudioDock />
      </div>
    </div>
  );
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const minimal = MINIMAL_CHROME_PREFIXES.some((p) => pathname.startsWith(p));

  if (minimal) {
    return <>{children}</>;
  }

  return (
    <EditorialIntelligenceProvider>
      <HeadlinesListenProvider>
        <ArticleSpeechProvider>
          <NavigationProvider>
            <ReaderAccountProvider>
              <PlaceProvider>
                <LiveProvider>
                  <NativeTouchLayer>
                    <AppChromeShell>{children}</AppChromeShell>
                  </NativeTouchLayer>
                </LiveProvider>
              </PlaceProvider>
            </ReaderAccountProvider>
          </NavigationProvider>
        </ArticleSpeechProvider>
      </HeadlinesListenProvider>
    </EditorialIntelligenceProvider>
  );
}
