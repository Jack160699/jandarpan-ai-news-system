"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import {
  HeroNewsCard,
  NewsGrid,
  ShortsSection,
} from "@/components/layout";
import { HomepageStackBands } from "@/components/layout/HomepageStackBands";
import { LazyHomeSection } from "@/components/homepage/LazyHomeSection";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { NewUpdatesBanner } from "@/components/live-newsroom/NewUpdatesBanner";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { LiveNewsroomProvider, useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  HyperlocalSkeleton,
} from "@/sections/homepage/HomepageSectionSkeletons";
import { HomeDeskSplit } from "@/components/home/HomeDeskSplit";
import { HighlightsDeskSkeleton } from "@/components/home/HighlightsDeskSkeleton";
import { HomepageFooter } from "@/components/footer/HomepageFooter";
import { useLocalizedFeed } from "@/hooks/useLocalizedFeed";
import { HomepageSeoHub } from "@/sections/homepage/HomepageSeoHub";

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
  const feed = useLocalizedFeed(serverFeed) ?? serverFeed;
  if (!feed) return null;

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
  const { language, t } = useLanguage();
  const feed = useLocalizedFeed(liveFeed) ?? liveFeed;

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

        <div className="home-body">
          <div className="home-body__main home-feed-stack">
            <LazyHomeSection
              id="highlights-desk"
              minHeight="0"
              className="home-highlights-desk-lazy"
              fallback={<HighlightsDeskSkeleton />}
              style={{ "--stagger": 2 } as CSSProperties}
            >
              <HomeDeskSplit feed={feed} freshIds={freshIds} />
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

          </div>

          <aside className="home-body__aside" aria-label="Local desk">
            <LocalBreakingAlerts alerts={feed.localBreakingAlerts} />
          </aside>
        </div>
      </div>

      <HomepageSeoHub />
      <HomepageFooter />
    </div>
  );
}
