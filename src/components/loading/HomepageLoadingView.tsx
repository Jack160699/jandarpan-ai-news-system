/**
 * Full homepage loading — mirrors daily HomepageView layout
 */

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
    <section className="pl-hero pl-stagger-item" aria-hidden>
      <div className="pl-shimmer-block pl-hero__flag" />
      <div className="pl-shimmer-block pl-hero__headline" />
      <div className="pl-shimmer-block pl-hero__headline pl-hero__headline--2" />
      <div className="pl-shimmer-block pl-hero__meta" />
      <div className="pl-shimmer-block pl-hero__media" />
      <div className="pl-hero__row">
        {[1, 2, 3].map((i) => (
          <div key={i} className="pl-shimmer-block pl-hero__chip" />
        ))}
      </div>
    </section>
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
    <article
      className={`pl-story-card pl-stagger-item ${compact ? "pl-story-card--compact" : ""}`.trim()}
      aria-hidden
    >
      <div className="pl-shimmer-block pl-story-card__thumb" />
      <div className={compact ? "pl-story-card__body" : undefined}>
        <div className="pl-shimmer-block pl-story-card__title" />
        <div className="pl-shimmer-block pl-story-card__title pl-story-card__title--2" />
        <div className="pl-shimmer-block pl-story-card__meta" />
      </div>
    </article>
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
      <div className="pl-wire-list">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="pl-wire-row pl-stagger-item">
            <div className="pl-shimmer-block pl-wire-row__dot" />
            <div className="pl-wire-row__lines">
              <div className="pl-shimmer-block" style={{ height: "0.75rem", width: "92%" }} />
              <div className="pl-shimmer-block" style={{ height: "0.5625rem", width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShortsRailSkeleton() {
  return (
    <section aria-hidden>
      <SectionHeaderSkeleton />
      <div className="pl-rail">
        {[1, 2, 3].map((i) => (
          <div key={i} className="pl-rail__slot pl-stagger-item">
            <div className="pl-shimmer-block pl-rail__card" />
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
