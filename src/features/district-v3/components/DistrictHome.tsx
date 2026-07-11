"use client";

import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import type { HomeArticle } from "@/lib/homepage/types";
import type { DistrictInfo, DistrictV3Data } from "../types";
import { DistrictHero } from "./DistrictHero";
import { DistrictStats } from "./DistrictStats";
import { DistrictSelector } from "./DistrictSelector";
import { FavoriteDistricts } from "./FavoriteDistricts";
import { GovernmentUpdates } from "./GovernmentUpdates";
import { WeatherWidget } from "./WeatherWidget";
import { TrafficWidget } from "./TrafficWidget";
import { JobsWidget } from "./JobsWidget";
import { EventsWidget } from "./EventsWidget";
import { CrimeUpdates } from "./CrimeUpdates";
import { BusinessUpdates } from "./BusinessUpdates";
import { TrendingStories } from "./TrendingStories";
import { DistrictTimeline } from "./DistrictTimeline";
import { Responsive } from "./Responsive";

export type DistrictHomeProps = {
  district: DistrictInfo;
  articles: HomeArticle[];
  data: DistrictV3Data;
};

/**
 * JDP-012 — District Home layout composing all district sections.
 */
export function DistrictHome({ district, articles, data }: DistrictHomeProps) {
  return (
    <div className="dv3-home">
      <HomeSectionErrorBoundary name="dv3-hero">
        <DistrictHero district={district} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="dv3-selector">
        <DistrictSelector currentSlug={district.slug} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="dv3-favorites">
        <FavoriteDistricts currentSlug={district.slug} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="dv3-stats">
        <DistrictStats stats={data.stats} />
      </HomeSectionErrorBoundary>

      <Responsive layout="widgets">
        <HomeSectionErrorBoundary name="dv3-weather">
          <WeatherWidget weather={data.weather} />
        </HomeSectionErrorBoundary>
        <HomeSectionErrorBoundary name="dv3-traffic">
          <TrafficWidget items={data.traffic} />
        </HomeSectionErrorBoundary>
      </Responsive>

      <HomeSectionErrorBoundary name="dv3-trending">
        <TrendingStories articles={articles} />
      </HomeSectionErrorBoundary>

      <Responsive layout="split">
        <HomeSectionErrorBoundary name="dv3-government">
          <GovernmentUpdates items={data.government} />
        </HomeSectionErrorBoundary>
        <HomeSectionErrorBoundary name="dv3-jobs">
          <JobsWidget items={data.jobs} />
        </HomeSectionErrorBoundary>
      </Responsive>

      <HomeSectionErrorBoundary name="dv3-events">
        <EventsWidget items={data.events} />
      </HomeSectionErrorBoundary>

      <Responsive layout="split">
        <HomeSectionErrorBoundary name="dv3-crime">
          <CrimeUpdates items={data.crime} />
        </HomeSectionErrorBoundary>
        <HomeSectionErrorBoundary name="dv3-business">
          <BusinessUpdates items={data.business} />
        </HomeSectionErrorBoundary>
      </Responsive>

      <HomeSectionErrorBoundary name="dv3-timeline">
        <DistrictTimeline events={data.timeline} />
      </HomeSectionErrorBoundary>
    </div>
  );
}
