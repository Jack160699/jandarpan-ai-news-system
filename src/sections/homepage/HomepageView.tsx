"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { AdSlot } from "@/components/monetization/AdSlot";
import {
  BreakingTicker,
  HeroNewsCard,
  NewsGrid,
  ShortsSection,
} from "@/components/layout";
import { LazyHomeSection } from "@/components/homepage/LazyHomeSection";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { buildTickerHeadlines } from "@/lib/homepage/ticker-headlines";
import {
  HyperlocalSkeleton,
  LiveWireSkeleton,
} from "@/sections/homepage/HomepageSectionSkeletons";
import { LiveWire } from "@/sections/homepage/LiveWire";
import { useLanguage } from "@/providers/LanguageProvider";

const HyperlocalFeeds = dynamic(
  () =>
    import("@/sections/homepage/HyperlocalFeeds").then((m) => ({
      default: m.HyperlocalFeeds,
    })),
  { loading: () => <HyperlocalSkeleton /> }
);

type HomepageViewProps = {
  feed: GeneratedHomepageFeed;
};

export function HomepageView({ feed }: HomepageViewProps) {
  const { t } = useLanguage();
  const { lead, supporting } = feed.editorsPicks;
  const topStories = [
    ...feed.breakingTicker.slice(0, 3),
    ...supporting.slice(0, 3),
  ].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  const heroLead = feed.breakingTicker[0] ?? lead;
  const tickerItems = useMemo(() => buildTickerHeadlines(feed), [feed]);

  return (
    <div className="home-page">
      <BreakingTicker items={tickerItems} />

      <div className="home-page__content pl-container">
        <HeroNewsCard
          lead={heroLead}
          topStories={topStories}
          featuredShort={feed.newsShorts[0]}
        />

        <div className="home-body">
          <div className="home-body__main">
            <LazyHomeSection
              id="wire"
              minHeight="200px"
              fallback={<LiveWireSkeleton />}
              style={{ "--stagger": 2 } as CSSProperties}
            >
              <LiveWire items={feed.liveWire} />
            </LazyHomeSection>

            {feed.newsShorts.length > 0 ? (
              <ShortsSection shorts={feed.newsShorts} />
            ) : null}

            <NewsGrid
              id="trending"
              title={t.home.trending}
              articles={feed.trending.slice(0, 8)}
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
