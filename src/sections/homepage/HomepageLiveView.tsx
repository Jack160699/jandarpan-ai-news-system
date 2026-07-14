"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { PersonalizedHomepageBody } from "@/components/personalization/PersonalizedHomepageBody";
import { HomepageStackBands } from "@/components/layout/HomepageStackBands";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import {
  hasValidHomeLead,
  homeDebug,
  normalizeHomepageFeed,
} from "@/lib/homepage/feed-safety";
import { isHomeV3Enabled } from "@/lib/homepage/config";
import { LiveNewsroomProvider } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { HomepageFooter } from "@/components/footer/HomepageFooter";
import { HomepageSeoHub } from "@/sections/homepage/HomepageSeoHub";
import { HomepageFeedFallback } from "@/sections/homepage/HomepageFeedFallback";

const HomeExperienceV3 = dynamic(
  () =>
    import("@/sections/homepage/v3/HomeExperienceV3").then((m) => ({
      default: m.HomeExperienceV3,
    })),
  { loading: () => null }
);

type HomepageLiveViewProps = {
  feed: GeneratedHomepageFeed;
};

export function HomepageLiveView({ feed: serverFeed }: HomepageLiveViewProps) {
  const { contentLocked, language } = useLanguage();

  const normalizedServer = useMemo(
    () => normalizeHomepageFeed(serverFeed),
    [serverFeed]
  );

  useEffect(() => {
    homeDebug("HomepageLiveView", {
      language,
      contentLocked,
      hasLead: hasValidHomeLead(normalizedServer),
    });
  }, [language, contentLocked, normalizedServer]);

  if (!normalizedServer || !hasValidHomeLead(normalizedServer)) {
    homeDebug("HomepageLiveView: empty feed");
    return <HomepageFeedFallback />;
  }

  const homeV3 = isHomeV3Enabled();

  return (
    <LiveNewsroomProvider
      initialFeed={normalizedServer}
      enabled={!contentLocked}
    >
      <div className="home-page">
        {!homeV3 ? (
          <HomeSectionErrorBoundary name="stack-bands">
            <HomepageStackBands
              trendingTopics={
                normalizedServer.footerIntelligence?.trendingSearches ?? []
              }
            />
          </HomeSectionErrorBoundary>
        ) : null}

        <div className="home-page__content pl-container">
          {homeV3 ? (
            <HomeExperienceV3 feed={normalizedServer} />
          ) : (
            <PersonalizedHomepageBody feed={normalizedServer} />
          )}
        </div>

        <HomeSectionErrorBoundary name="explore-topics">
          <HomepageSeoHub />
        </HomeSectionErrorBoundary>

        <HomepageFooter />
      </div>
    </LiveNewsroomProvider>
  );
}
