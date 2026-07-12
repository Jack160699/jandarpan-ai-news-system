"use client";

import { EXECUTIVE_ANALYTICS_PLACEHOLDER } from "./data/placeholders";
import type { ExecutiveAnalyticsData } from "./types";
import {
  ActiveUsersWidget,
  AIUsageWidget,
  DistrictHeatmapPlaceholder,
  EngagementWidget,
  LiveStatusWidget,
  PerformanceWidget,
  ReadersTodayWidget,
  RevenuePlaceholder,
  SystemHealthWidget,
  TopStoriesWidget,
} from "./widgets";
import "./styles/analytics-v3.css";

export type AnalyticsDashboardV3Props = {
  data?: Partial<ExecutiveAnalyticsData>;
  className?: string;
};

/**
 * JDP-018 — Executive Analytics Dashboard V3
 * UI-only command center with placeholder data. Wire live APIs later.
 */
export function AnalyticsDashboardV3({ data, className }: AnalyticsDashboardV3Props) {
  const vm: ExecutiveAnalyticsData = {
    ...EXECUTIVE_ANALYTICS_PLACEHOLDER,
    ...data,
    readersToday: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.readersToday, ...data?.readersToday },
    activeUsers: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.activeUsers, ...data?.activeUsers },
    aiUsage: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.aiUsage, ...data?.aiUsage },
    engagement: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.engagement, ...data?.engagement },
    liveStatus: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.liveStatus, ...data?.liveStatus },
    performance: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.performance, ...data?.performance },
    systemHealth: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.systemHealth, ...data?.systemHealth },
    revenue: { ...EXECUTIVE_ANALYTICS_PLACEHOLDER.revenue, ...data?.revenue },
    topStories: data?.topStories ?? EXECUTIVE_ANALYTICS_PLACEHOLDER.topStories,
    districtHeatmap: data?.districtHeatmap ?? EXECUTIVE_ANALYTICS_PLACEHOLDER.districtHeatmap,
    updatedAt: data?.updatedAt ?? EXECUTIVE_ANALYTICS_PLACEHOLDER.updatedAt,
  };

  return (
    <div className={`av3-root jds-root ${className ?? ""}`.trim()}>
      <header className="av3-hero" aria-label="Executive analytics overview">
        <div className="av3-hero__main">
          <p className="av3-hero__eyebrow">Project Phoenix · JDP-018</p>
          <h2 className="av3-hero__title">Executive Analytics</h2>
          <p className="av3-hero__subtitle">
            Real-time reader intelligence, engagement, AI usage, and platform health at a glance.
          </p>
        </div>
        <div className="av3-hero__badge">
          <span className="av3-live-pulse">Dashboard preview</span>
          <span className="av3-hero__note">UI-only · no backend</span>
        </div>
      </header>

      <div className="av3-grid">
        <LiveStatusWidget data={vm.liveStatus} updatedAt={vm.updatedAt} />

        <ReadersTodayWidget data={vm.readersToday} />
        <ActiveUsersWidget data={vm.activeUsers} />
        <EngagementWidget data={vm.engagement} />

        <TopStoriesWidget stories={vm.topStories} />
        <DistrictHeatmapPlaceholder districts={vm.districtHeatmap} />

        <AIUsageWidget data={vm.aiUsage} />
        <RevenuePlaceholder data={vm.revenue} />
        <PerformanceWidget data={vm.performance} />
        <SystemHealthWidget data={vm.systemHealth} />
      </div>
    </div>
  );
}
