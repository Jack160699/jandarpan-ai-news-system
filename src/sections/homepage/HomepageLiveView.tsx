"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  HeroNewsCard,
  NewsGrid,
  ShortsSection,
} from "@/components/layout";
import { HomepageStackBands } from "@/components/layout/HomepageStackBands";
import { LazyHomeSection } from "@/components/homepage/LazyHomeSection";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { NewUpdatesBanner } from "@/components/live-newsroom/NewUpdatesBanner";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { HomepageLoadingView } from "@/components/loading";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import {
  hasValidHomeLead,
  homeDebug,
  normalizeHomepageFeed,
  safeArticleRanking,
} from "@/lib/homepage/feed-safety";
import { LiveNewsroomProvider, useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  HyperlocalSkeleton,
} from "@/sections/homepage/HomepageSectionSkeletons";
import { HomeDeskSplit } from "@/components/home/HomeDeskSplit";
import { HighlightsDeskSkeleton } from "@/components/home/HighlightsDeskSkeleton";
import { HomepageFooter } from "@/components/footer/HomepageFooter";
import { useLocalizedFeed } from "@/hooks/useLocalizedFeed";
import { HomepageFeedFallback } from "@/sections/homepage/HomepageFeedFallback";

const HyperlocalFeeds = dynamic(
  () =>
    import("@/sections/homepage/HyperlocalFeeds").then((m) => ({
      default: m.HyperlocalFeeds,
    })),
  { loading: () => <HyperlocalSkeleton /> }
);

type HomepageLiveViewProps = {
  feed: GeneratedHomepageFeed;
};

export function HomepageLiveView({ feed: serverFeed }: HomepageLiveViewProps) {
  const { contentLocked, ready, language, mounted: langMounted } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const normalizedServer = useMemo(
    () => normalizeHomepageFeed(serverFeed),
    [serverFeed]
  );
  const feed = useLocalizedFeed(normalizedServer) ?? normalizedServer;

  useEffect(() => {
    setMounted(true);
    homeDebug("HomepageLiveView", {
      language,
      ready,
      langMounted,
      contentLocked,
      hasLead: hasValidHomeLead(feed),
    });
  }, [language, ready, langMounted, contentLocked, feed]);

  if (contentLocked) {
    return null;
  }

  if (!mounted || !langMounted) {
    return <HomepageLoadingView />;
  }

  if (!feed || !hasValidHomeLead(feed)) {
    homeDebug("HomepageLiveView: empty feed");
    return <HomepageFeedFallback />;
  }

  return (
    <LiveNewsroomProvider initialFeed={feed}>
      <HomepageLiveContent
        trendingTopics={feed.footerIntelligence?.trendingSearches ?? []}
      />
    </LiveNewsroomProvider>
  );
}

type HomepageLiveContentProps = {
  trendingTopics: string[];
};

function HomepageLiveContent({ trendingTopics }: HomepageLiveContentProps) {
  const { feed: liveFeed, freshIds } = useLiveNewsroom();
  const { t } = useLanguage();
  const localized = useLocalizedFeed(liveFeed);
  const feed = localized ?? normalizeHomepageFeed(liveFeed);

  if (!feed || !hasValidHomeLead(feed)) {
    return <HomepageFeedFallback />;
  }

  const lead = feed.editorsPicks.lead;
  const supporting = feed.editorsPicks.supporting ?? [];

  const topStories = [
    ...(feed.breakingTicker ?? []).slice(0, 3),
    ...supporting.slice(0, 3),
  ].filter(
    (a, i, arr) =>
      a?.id && a.headline?.trim() && arr.findIndex((x) => x?.id === a.id) === i
  );

  const heroLead =
    feed.breakingTicker?.[0] ??
    lead ??
    feed.trending?.[0] ??
    feed.liveWire?.[0];

  if (!heroLead?.headline?.trim()) {
    return <HomepageFeedFallback />;
  }

  const heroSafe = {
    ...heroLead,
    ranking: safeArticleRanking(heroLead),
  };

  return (
    <div className="home-page">
      <HomeSectionErrorBoundary name="stack-bands">
        <HomepageStackBands trendingTopics={trendingTopics ?? []} />
      </HomeSectionErrorBoundary>

      <NewUpdatesBanner />

      <div className="home-page__content pl-container">
        <HomeSectionErrorBoundary name="hero">
          <HeroNewsCard
            lead={heroSafe}
            topStories={topStories}
            featuredShort={feed.newsShorts?.[0]}
          />
        </HomeSectionErrorBoundary>

        <div className="home-body">
          <div className="home-body__main home-feed-stack">
            <HomeSectionErrorBoundary name="highlights-desk">
              <LazyHomeSection
                id="highlights-desk"
                minHeight="0"
                className="home-highlights-desk-lazy"
                fallback={<HighlightsDeskSkeleton />}
                style={{ "--stagger": 2 } as CSSProperties}
              >
                <HomeDeskSplit feed={feed} freshIds={freshIds} />
              </LazyHomeSection>
            </HomeSectionErrorBoundary>

            {(feed.newsShorts?.length ?? 0) > 0 ? (
              <HomeSectionErrorBoundary name="shorts">
                <ShortsSection shorts={feed.newsShorts} />
              </HomeSectionErrorBoundary>
            ) : null}

            {(feed.trending?.length ?? 0) > 0 ? (
              <HomeSectionErrorBoundary name="trending">
                <NewsGrid
                  id="trending"
                  title={t.home.trending}
                  articles={feed.trending.slice(0, 6)}
                  freshIds={freshIds}
                />
              </HomeSectionErrorBoundary>
            ) : null}

            {(feed.hyperlocalFeeds?.length ?? 0) > 0 ? (
              <HomeSectionErrorBoundary name="hyperlocal">
                <LazyHomeSection
                  minHeight="160px"
                  fallback={<HyperlocalSkeleton />}
                  style={{ "--stagger": 5 } as CSSProperties}
                >
                  <HyperlocalFeeds feeds={feed.hyperlocalFeeds.slice(0, 4)} />
                </LazyHomeSection>
              </HomeSectionErrorBoundary>
            ) : null}
          </div>

          <aside className="home-body__aside" aria-label="Local desk">
            <HomeSectionErrorBoundary name="local-alerts">
              <LocalBreakingAlerts alerts={feed.localBreakingAlerts ?? []} />
            </HomeSectionErrorBoundary>
          </aside>
        </div>
      </div>

      <HomepageFooter />
    </div>
  );
}
