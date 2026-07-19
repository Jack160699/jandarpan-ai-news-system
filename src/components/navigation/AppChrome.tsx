"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { AdSlot } from "@/components/monetization/AdSlot";
import { AppLayout } from "@/components/layout/AppLayout";
import { SkipLink } from "@/components/ui/SkipLink";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/cn";
import { ArticleSpeechProvider } from "@/providers/ArticleSpeechProvider";
import { EditorialIntelligenceProvider } from "@/providers/EditorialIntelligenceProvider";
import { HeadlinesListenProvider } from "@/providers/HeadlinesListenProvider";
import { NavigationProvider } from "@/providers/NavigationProvider";
import { ReaderAccountProvider } from "@/providers/ReaderAccountProvider";
import { NavProgress } from "./NavProgress";
import { NativeTouchLayer } from "@/components/mobile/NativeTouchLayer";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { ScrollRetention } from "@/components/mobile/ScrollRetention";
import { AppHydration } from "./AppHydration";
import { RouteTransition } from "./RouteTransition";

const ContinueRibbon = dynamic(
  () =>
    import("@/components/editorial/ContinueRibbon").then((m) => ({
      default: m.ContinueRibbon,
    })),
  { ssr: false }
);

const HeadlinesMiniPlayer = dynamic(
  () =>
    import("@/components/listen/HeadlinesMiniPlayer").then((m) => ({
      default: m.HeadlinesMiniPlayer,
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

/**
 * Reader Design System routes render their own masthead + bottom navigation,
 * so they opt out of the legacy app chrome entirely (flag-gated).
 * Exact routes + dynamic prefixes for hubs.
 */
const READER_DS_EXACT = new Set(["/", "/district", "/latest", "/trending", "/search", "/live"]);
const READER_DS_PREFIXES = ["/district/", "/category/", "/topics/", "/live/"];

function isReaderDsRoute(pathname: string): boolean {
  if (READER_DS_EXACT.has(pathname)) return true;
  return READER_DS_PREFIXES.some((p) => pathname.startsWith(p));
}

function ShortsLanguageShell({ children }: AppChromeProps) {
  const { contentLocked } = useLanguage();

  return (
    <div className={cn(contentLocked && "app-shell--lang-locked")}>
      <div className="app-shell__content">{children}</div>
    </div>
  );
}

function AppChromeShell({ children }: AppChromeProps) {
  const pathname = usePathname();
  const { contentLocked } = useLanguage();
  const isStory = pathname.startsWith("/story/");

  return (
    <div
      className={cn(
        "app-shell",
        !isStory && "has-bottom-nav",
        isStory && "app-shell--story",
        contentLocked && "app-shell--lang-locked"
      )}
      data-hydrated="false"
    >
      <AppHydration />
      <SkipLink />
      <NavProgress />
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
        <HeadlinesMiniPlayer />
      </div>
    </div>
  );
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const minimal = MINIMAL_CHROME_PREFIXES.some((p) => pathname.startsWith(p));

  if (minimal || (isReaderDesignSystemEnabled() && isReaderDsRoute(pathname))) {
    return <>{children}</>;
  }

  if (pathname === "/shorts") {
    return (
      <EditorialIntelligenceProvider>
        <HeadlinesListenProvider>
          <ArticleSpeechProvider>
            <NavigationProvider>
              <ReaderAccountProvider>
                <NativeTouchLayer>
                  <ShortsLanguageShell>{children}</ShortsLanguageShell>
                </NativeTouchLayer>
              </ReaderAccountProvider>
            </NavigationProvider>
          </ArticleSpeechProvider>
        </HeadlinesListenProvider>
      </EditorialIntelligenceProvider>
    );
  }

  return (
    <EditorialIntelligenceProvider>
      <HeadlinesListenProvider>
        <ArticleSpeechProvider>
          <NavigationProvider>
            <ReaderAccountProvider>
              <NativeTouchLayer>
                <AppChromeShell>{children}</AppChromeShell>
              </NativeTouchLayer>
            </ReaderAccountProvider>
          </NavigationProvider>
        </ArticleSpeechProvider>
      </HeadlinesListenProvider>
    </EditorialIntelligenceProvider>
  );
}
