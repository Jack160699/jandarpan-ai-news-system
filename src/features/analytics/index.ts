/**
 * JDP-018 — Executive Analytics Dashboard V3
 */

export { isAnalyticsV3Enabled } from "./config";
export { AnalyticsDashboardV3 } from "./AnalyticsDashboardV3";
export type { AnalyticsDashboardV3Props } from "./AnalyticsDashboardV3";

export { WidgetShell } from "./components/WidgetShell";
export { MetricTrend } from "./components/MetricTrend";

export {
  ReadersTodayWidget,
  ActiveUsersWidget,
  TopStoriesWidget,
  DistrictHeatmapPlaceholder,
  AIUsageWidget,
  RevenuePlaceholder,
  EngagementWidget,
  LiveStatusWidget,
  PerformanceWidget,
  SystemHealthWidget,
} from "./widgets";

export { EXECUTIVE_ANALYTICS_PLACEHOLDER } from "./data/placeholders";

export type {
  ExecutiveAnalyticsData,
  AnalyticsTrend,
  TopStoryItem,
  DistrictHeatCell,
  AIUsageMetric,
  EngagementMetric,
  LiveStatusItem,
  PerformanceMetric,
  HealthCheck,
} from "./types";
