"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
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
} from "@/sections/homepage/HomepageSectionSkeletons";
import { HyperlocalFeeds } from "@/lib/lazy/hyperlocal-feeds";
import { HomeDeskSplit } from "@/components/home/HomeDeskSplit";
import { HighlightsDeskSkeleton } from "@/components/home/HighlightsDeskSkeleton";
import { useLanguage } from "@/providers/LanguageProvider";

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
          <div className="home-body__main home-feed-stack">
            <LazyHomeSection
              id="highlights-desk"
              minHeight="0"
              className="home-highlights-desk-lazy"
              fallback={<HighlightsDeskSkeleton />}
              style={{ "--stagger": 2 } as CSSProperties}
            >
              <HomeDeskSplit feed={feed} />
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

          </div>

          <aside className="home-body__aside" aria-label="Local desk">
            <LocalBreakingAlerts alerts={feed.localBreakingAlerts} />
          </aside>
        </div>
      </div>
    </div>
  );
}
