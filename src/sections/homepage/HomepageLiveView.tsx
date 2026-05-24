"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { AdSlot } from "@/components/monetization/AdSlot";
import {
  HeroNewsCard,
  NewsGrid,
  ShortsSection,
} from "@/components/layout";
import { HomepageStackBands } from "@/components/layout/HomepageStackBands";
import { LazyHomeSection } from "@/components/homepage/LazyHomeSection";
import { QuickActionButtons } from "@/components/homepage/QuickActionButtons";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { NewUpdatesBanner } from "@/components/live-newsroom/NewUpdatesBanner";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { LiveNewsroomProvider, useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  HyperlocalSkeleton,
  LiveWireSkeleton,
} from "@/sections/homepage/HomepageSectionSkeletons";
import { LiveWire } from "@/sections/homepage/LiveWire";

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

export function HomepageLiveView({ feed }: HomepageLiveViewProps) {
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
  const { feed, freshIds } = useLiveNewsroom();
  const { t } = useLanguage();

  const { lead, supporting } = feed.editorsPicks;
  const topStories = [
    ...feed.breakingTicker.slice(0, 3),
    ...supporting.slice(0, 3),
  ].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  const heroLead = feed.breakingTicker[0] ?? lead;

  return (
    <div className="home-page">
      <HomepageStackBands trendingTopics={trendingTopics} />

      <NewUpdatesBanner />

      <div className="home-page__content pl-container">
        <HeroNewsCard
          lead={heroLead}
          topStories={topStories}
          featuredShort={feed.newsShorts[0]}
        />

        <QuickActionButtons />

        <div className="home-body">
          <div className="home-body__main">
            <LazyHomeSection
              id="wire"
              minHeight="200px"
              fallback={<LiveWireSkeleton />}
              style={{ "--stagger": 2 } as CSSProperties}
            >
              <LiveWire items={feed.liveWire} freshIds={freshIds} />
            </LazyHomeSection>

            {feed.newsShorts.length > 0 ? (
              <ShortsSection shorts={feed.newsShorts} />
            ) : null}

            <NewsGrid
              id="trending"
              title={t.home.trending}
              articles={feed.trending.slice(0, 8)}
              freshIds={freshIds}
            />

            <LazyHomeSection
              minHeight="200px"
              fallback={<HyperlocalSkeleton />}
              style={{ "--stagger": 5 } as CSSProperties}
            >
              <HyperlocalFeeds feeds={feed.hyperlocalFeeds.slice(0, 6)} />
            </LazyHomeSection>

            <div className="nr-ad-slot">
              <AdSlot slotId="home_mid_feed" />
            </div>
          </div>

          <aside className="home-body__aside" aria-label="Local desk">
            <LocalBreakingAlerts alerts={feed.localBreakingAlerts} />
          </aside>
        </div>
      </div>
    </div>
  );
}
