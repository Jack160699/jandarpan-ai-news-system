"use client";

import { useCallback, useEffect, useState } from "react";
import { PageStickyBand } from "@/components/navigation/PageStickyBand";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { LiveNewsroomStatus } from "@/components/live-newsroom/LiveNewsroomStatus";
import { PageContainer } from "@/layouts/PageContainer";
import { LiveNewsroomProvider, useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLiveV3Filters } from "./hooks/useLiveV3Filters";
import {
  AutoUpdateBanner,
  BreakingHeader,
  DistrictFilter,
  Empty,
  Error,
  EventGrouping,
  LiveCounter,
  LiveFeed,
  LiveFilters,
  Loading,
  Timeline,
} from "./components";
import { LIVE_V3_REFRESH_HINT } from "./constants";
import type { LiveExperienceV3Props } from "./types";
import "./styles/live-v3.css";

/**
 * JDP-015 — Live News Experience V3
 *
 * Presentation layer over existing homepage feed + /api/homepage/live polling.
 * No backend changes.
 */
export function LiveExperienceV3({
  feed,
  simulateLoadMs = 0,
}: LiveExperienceV3Props) {
  return (
    <LiveNewsroomProvider initialFeed={feed}>
      <LiveExperienceV3Content simulateLoadMs={simulateLoadMs} />
    </LiveNewsroomProvider>
  );
}

function LiveExperienceV3Content({
  simulateLoadMs,
}: {
  simulateLoadMs: number;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    simulateLoadMs > 0 ? "loading" : "ready"
  );
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (simulateLoadMs <= 0) return undefined;
    const timer = window.setTimeout(() => setPhase("ready"), simulateLoadMs);
    return () => window.clearTimeout(timer);
  }, [simulateLoadMs, sessionKey]);

  const retry = useCallback(() => {
    setPhase("loading");
    setSessionKey((k) => k + 1);
    window.setTimeout(() => setPhase("ready"), 400);
  }, []);

  if (phase === "loading") {
    return (
      <PageContainer width="default" className="lv3-page">
        <Loading />
      </PageContainer>
    );
  }

  if (phase === "error") {
    return (
      <PageContainer width="default" className="lv3-page">
        <Error onRetry={retry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default" className="lv3-page" key={sessionKey}>
      <HomeSectionErrorBoundary
        name="lv3-live"
        fallback={
          <Error
            title="Live desk unavailable"
            message="We couldn't render the live feed. Please refresh the page."
            onRetry={() => window.location.reload()}
          />
        }
      >
        <LiveExperienceBody />
      </HomeSectionErrorBoundary>
    </PageContainer>
  );
}

function LiveExperienceBody() {
  const { feed, freshIds } = useLiveNewsroom();
  const filters = useLiveV3Filters({
    liveWire: feed.liveWire,
    breakingTicker: feed.breakingTicker,
  });

  const hasContent = filters.filteredItems.length > 0;
  const multiUpdateGroups = filters.eventGroups.filter(
    (group) => group.updateCount > 1
  );

  return (
    <div className="lv3-live nr--has-page-stickies nr--has-live-strip">
      <header className="lv3-header">
        <div className="lv3-header__status" aria-live="polite">
          <span className="lv3-header__pulse" aria-hidden />
          <span className="lv3-header__label">LIVE</span>
        </div>
        <h1 className="lv3-header__title">Live Desk</h1>
        <p className="lv3-header__sub">ताज़ा अपडेट · छत्तीसगढ़</p>
        <p className="lv3-header__hint">{LIVE_V3_REFRESH_HINT}</p>
      </header>

      <PageStickyBand>
        <div className="lv3-strip">
          <LiveNewsroomStatus />
          <AutoUpdateBanner />
        </div>
      </PageStickyBand>

      <BreakingHeader items={filters.breakingItems} />

      <div className="lv3-toolbar lv3-enter">
        <LiveCounter
          count={filters.liveCount}
          total={filters.allItems.length}
        />
        <LiveFilters
          scope={filters.scope}
          viewMode={filters.viewMode}
          onScopeChange={filters.setScope}
          onViewModeChange={filters.setViewMode}
        />
        <DistrictFilter
          district={filters.district}
          counts={filters.districtCounts}
          onDistrictChange={filters.setDistrict}
        />
      </div>

      {hasContent ? (
        <div className="lv3-body lv3-enter">
          {filters.viewMode === "timeline" ? (
            <Timeline entries={filters.timeline} freshIds={freshIds} />
          ) : (
            <>
              <LiveFeed items={filters.filteredItems} freshIds={freshIds} />
              {multiUpdateGroups.length > 0 ? (
                <section
                  className="lv3-related"
                  aria-labelledby="lv3-related-title"
                >
                  <h2 id="lv3-related-title" className="lv3-related__title">
                    Developing stories
                  </h2>
                  <EventGrouping
                    groups={multiUpdateGroups}
                    freshIds={freshIds}
                  />
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <Empty
          title={
            filters.district
              ? "No live updates for this district"
              : "No live updates right now"
          }
          description={
            filters.scope !== "all"
              ? "Try widening your filters or check back in a few minutes."
              : "The newsroom is quiet. Breaking and developing stories will appear here as they happen."
          }
        />
      )}
    </div>
  );
}
