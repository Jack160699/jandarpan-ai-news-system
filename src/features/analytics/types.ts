/**
 * JDP-018 — Executive Analytics Dashboard types (UI-only)
 */

export type TrendDirection = "up" | "down" | "flat";

export type AnalyticsTrend = {
  value: number;
  direction: TrendDirection;
  label: string;
};

export type SparklinePoint = {
  label: string;
  value: number;
};

export type TopStoryItem = {
  id: string;
  rank: number;
  headline: string;
  district: string;
  views: number;
  changePct: number;
};

export type DistrictHeatCell = {
  id: string;
  name: string;
  readers: number;
  intensity: number;
};

export type AIUsageMetric = {
  label: string;
  value: string;
  sublabel?: string;
};

export type EngagementMetric = {
  label: string;
  value: string;
  trend?: AnalyticsTrend;
};

export type LiveStatusItem = {
  id: string;
  label: string;
  status: "live" | "degraded" | "offline";
  detail: string;
};

export type PerformanceMetric = {
  label: string;
  value: string;
  target: string;
  status: "good" | "warn" | "bad";
};

export type HealthCheck = {
  id: string;
  label: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
};

export type ExecutiveAnalyticsData = {
  updatedAt: string;
  readersToday: {
    total: number;
    trend: AnalyticsTrend;
    sparkline: SparklinePoint[];
  };
  activeUsers: {
    current: number;
    peak: number;
    trend: AnalyticsTrend;
  };
  topStories: TopStoryItem[];
  districtHeatmap: DistrictHeatCell[];
  aiUsage: {
    summary: AIUsageMetric[];
    requestsToday: number;
    tokensToday: number;
    trend: AnalyticsTrend;
  };
  revenue: {
    placeholder: true;
    message: string;
  };
  engagement: {
    metrics: EngagementMetric[];
    score: number;
  };
  liveStatus: {
    overall: "live" | "degraded" | "offline";
    items: LiveStatusItem[];
  };
  performance: {
    metrics: PerformanceMetric[];
    score: number;
  };
  systemHealth: {
    overall: "healthy" | "degraded" | "down";
    checks: HealthCheck[];
  };
};
