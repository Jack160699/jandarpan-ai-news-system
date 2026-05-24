/**
 * Full homepage loading — mirrors daily HomepageView layout
 */

import { FeedNewsCardSkeleton } from "@/components/feed/FeedNewsCardSkeleton";
import { HeroNewsCardSkeleton } from "@/components/layout/HeroNewsCardSkeleton";
import { QuickUpdateCardSkeleton } from "@/components/quick-update/QuickUpdateCardSkeleton";
import { ShortsReelCardSkeleton } from "@/components/shorts/ShortsReelCardSkeleton";

export function MastheadSkeleton() {
  return (
    <header className="pl-masthead pl-stagger-item" aria-hidden>
      <div className="pl-shimmer-block pl-masthead__rule" />
      <div className="pl-shimmer-block pl-masthead__title" />
      <div className="pl-shimmer-block pl-masthead__tag" />
      <div className="pl-shimmer-block pl-masthead__date" />
    </header>
  );
}

export function BreakingTickerSkeleton() {
  return (
    <div className="pl-ticker pl-stagger-item" aria-hidden>
      <div className="pl-shimmer-block pl-ticker__pill" />
      <div className="pl-shimmer-block pl-ticker__track" />
    </div>
  );
}

export function BreakingHeroSkeleton() {
  return (
    <div className="pl-stagger-item">
      <HeroNewsCardSkeleton />
    </div>
  );
}

export function LocalAlertsSkeleton() {
  return (
    <div className="pl-chips pl-stagger-item" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="pl-shimmer-block pl-chips__item" />
      ))}
    </div>
  );
}

export function SectionHeaderSkeleton() {
  return (
    <div className="pl-section-head pl-stagger-item" aria-hidden>
      <div>
        <div className="pl-shimmer-block pl-section-head__kicker" />
        <div className="pl-shimmer-block pl-section-head__title" />
      </div>
      <div className="pl-shimmer-block pl-section-head__more" />
    </div>
  );
}

export function StoryCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="pl-stagger-item">
      <FeedNewsCardSkeleton variant={compact ? "compact" : "standard"} />
    </div>
  );
}

export function TrendingStoriesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="pl-stagger-item" aria-hidden>
      <SectionHeaderSkeleton />
      {Array.from({ length: count }, (_, i) => (
        <StoryCardSkeleton key={i} compact={i > 0} />
      ))}
    </section>
  );
}

export function LiveWireListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <section aria-hidden>
      <SectionHeaderSkeleton />
      <div className="pl-stagger-item">
        <QuickUpdateCardSkeleton rows={rows} variant="feed" />
      </div>
    </section>
  );
}

export function ShortsRailSkeleton() {
  return (
    <section aria-hidden>
      <SectionHeaderSkeleton />
      <div className="pl-rail shorts-section__rail--snap">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="pl-rail__slot pl-stagger-item shorts-section__slot--reel"
          >
            <ShortsReelCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HyperlocalRailSkeleton() {
  return (
    <section aria-hidden>
      <SectionHeaderSkeleton />
      <div className="pl-rail">
        {[1, 2, 3].map((i) => (
          <div key={i} className="pl-rail__slot pl-rail__slot--wide pl-stagger-item">
            <div className="pl-shimmer-block pl-rail__card pl-rail__card--wire" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Complete daily homepage placeholder */
export function HomepageLoadingView() {
  return (
    <div
      className="nr nr--daily pl-home-daily pl-stagger"
      aria-busy="true"
      aria-label="Loading news"
    >
      <MastheadSkeleton />
      <BreakingTickerSkeleton />
      <BreakingHeroSkeleton />
      <LocalAlertsSkeleton />
      <LiveWireListSkeleton />
      <ShortsRailSkeleton />
      <TrendingStoriesSkeleton />
      <HyperlocalRailSkeleton />
    </div>
  );
}
