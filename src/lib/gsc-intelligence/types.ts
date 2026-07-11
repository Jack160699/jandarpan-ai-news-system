/**
 * GSC Intelligence — shared types
 */

export type GscTrend = "rising" | "stable" | "declining";
export type GscPriority = "high" | "medium" | "low";
export type GscHealthStatus = "healthy" | "warning" | "error" | "unknown";
export type GscIndexedStatus = "indexed" | "unknown" | "excluded" | "error";

export type GscRecommendationType =
  | "ctr_opportunity"
  | "position_opportunity"
  | "title_improvement"
  | "meta_improvement"
  | "expand_article"
  | "add_faq"
  | "improve_schema"
  | "improve_internal_links"
  | "index_issue";

export interface GscAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscDailyMetricRecord {
  metric_date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryRecord {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previous_position?: number | null;
  position_delta?: number | null;
  trend: GscTrend;
  district?: string | null;
  category?: string | null;
  generated_article_id?: string | null;
  generated_article_slug?: string | null;
  topic?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface GscPageRecord {
  page_url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  indexed_status: GscIndexedStatus;
  generated_article_id?: string | null;
  generated_article_slug?: string | null;
  district?: string | null;
  category?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface GscIndexHealthRecord {
  indexed_pages: number;
  excluded_pages: number;
  errors: number;
  warnings: number;
  sitemap_health: GscHealthStatus;
  news_sitemap_health: GscHealthStatus;
  canonical_issues: number;
  robots_issues: number;
  raw_metadata?: Record<string, unknown>;
}

export interface GscRecommendationRecord {
  recommendation_type: GscRecommendationType;
  priority: GscPriority;
  title: string;
  reason: string;
  query?: string | null;
  page_url?: string | null;
  scores?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface GscTrendPeriod {
  days: number;
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicks_delta: number;
  impressions_delta: number;
}

export interface GscExecutiveReport {
  topWinners: Array<{ query: string; clicks_delta: number; position_delta: number }>;
  topLosers: Array<{ query: string; clicks_delta: number; position_delta: number }>;
  fastestGrowingKeywords: Array<{ query: string; impressions_delta: number }>;
  fastestDecliningKeywords: Array<{ query: string; impressions_delta: number }>;
  mostClickedArticles: Array<{ page_url: string; clicks: number; slug?: string }>;
  highestCtr: Array<{ query: string; ctr: number; clicks: number }>;
  lowestCtr: Array<{ query: string; ctr: number; impressions: number }>;
}

export interface GscDashboard {
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  periodDays: number;
  lastSyncAt: string | null;
  topQueries: GscQueryRecord[];
  topPages: GscPageRecord[];
  indexHealth: GscIndexHealthRecord | null;
  ctrOpportunities: GscRecommendationRecord[];
  growthCharts: GscDailyMetricRecord[];
  trends: {
    days7: GscTrendPeriod;
    days30: GscTrendPeriod;
    days90: GscTrendPeriod;
  };
  executiveReport: GscExecutiveReport;
  districtTrends: Array<{ district: string; clicks: number; trend: GscTrend }>;
  categoryTrends: Array<{ category: string; clicks: number; trend: GscTrend }>;
}

export interface GscEngineResult {
  ok: boolean;
  status: "completed" | "skipped" | "failed";
  durationMs: number;
  dailyMetricsSaved: number;
  queriesUpdated: number;
  pagesUpdated: number;
  recommendationsGenerated: number;
  errors: string[];
  skippedReason?: string;
}

export interface ArticleLinkHint {
  id: string;
  slug: string;
  headline: string;
  tags: string[];
  district: string | null;
  url: string;
}
