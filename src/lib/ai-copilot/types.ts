/**
 * AI Editorial Copilot — shared types
 */

export type RecommendationSource =
  | "seo_intelligence"
  | "serp_tracker"
  | "search_console"
  | "execution_engine"
  | "competitor_intelligence"
  | "copilot";

export type RecommendationStatus =
  | "open"
  | "viewed"
  | "approved"
  | "applied"
  | "rejected"
  | "dismissed";

export type CopilotPriority = "high" | "medium" | "low";

export type ActionType =
  | "generated"
  | "viewed"
  | "approved"
  | "applied"
  | "rejected"
  | "rollback"
  | "chat_query";

export type ReportType =
  | "daily_briefing"
  | "weekly_seo"
  | "monthly_executive"
  | "growth_report"
  | "opportunities"
  | "risks";

export interface UnifiedRecommendation {
  id: string;
  external_key: string;
  source: RecommendationSource;
  priority: CopilotPriority;
  confidence: number;
  article_id: string | null;
  article_slug: string | null;
  district: string | null;
  category: string | null;
  title: string;
  reason: string;
  recommended_action: string;
  status: RecommendationStatus;
  priority_score: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecommendationDraft {
  external_key: string;
  source: RecommendationSource;
  priority: CopilotPriority;
  confidence: number;
  article_id?: string | null;
  article_slug?: string | null;
  district?: string | null;
  category?: string | null;
  title: string;
  reason: string;
  recommended_action: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutiveDashboard {
  overallSeoHealth: number;
  trafficTrend: { clicks: number; impressions: number; clicksDelta: number };
  publishingStatus: { publishedToday: number; scheduled: number; pendingReview: number };
  competitorActivity: { articlesLast24h: number; topSource: string | null };
  serpVisibility: number;
  searchConsoleSummary: { clicks: number; ctr: number; avgPosition: number };
  pendingSeoRecommendations: number;
  pendingEditorialReviews: number;
  districtCoverage: Array<{ district: string; coveragePercent: number; trend: string }>;
  breakingTopics: Array<{ topic: string; score: number; trend: string }>;
}

export interface ChatResponse {
  answer: string;
  intent: string;
  evidence: string[];
  links: Array<{ label: string; href: string }>;
  suggestedActions: Array<{ label: string; action: string; recommendationId?: string }>;
  chartData?: Array<Record<string, string | number>>;
}

export interface InsightSearchResult {
  query: string;
  articles: Array<{ slug: string; headline: string; district?: string }>;
  competitors: Array<{ title: string; source: string }>;
  queries: Array<{ query: string; clicks: number }>;
  recommendations: UnifiedRecommendation[];
  serp: Array<{ keyword: string; position: number | null }>;
  gsc: Array<{ query: string; position: number }>;
}

export interface ArticleWorkspace {
  article: {
    id: string;
    slug: string;
    headline: string;
    district: string | null;
    category: string | null;
  };
  seoAudit: Record<string, unknown> | null;
  competitors: Array<{ title: string; url: string }>;
  gscMetrics: Array<{ query: string; clicks: number; position: number }>;
  serpRankings: Array<{ keyword: string; position: number | null }>;
  keywordGaps: string[];
  pendingSuggestions: number;
  links: {
    execution: string;
    editor: string;
    story: string;
  };
}

export interface CopilotDashboard {
  executive: ExecutiveDashboard;
  priorityQueue: UnifiedRecommendation[];
  recentReports: Array<{ id: string; report_type: ReportType; title: string; summary: string; generated_at: string }>;
  enabled: boolean;
}

export interface GeneratedReport {
  report_type: ReportType;
  title: string;
  summary: string;
  content: Record<string, unknown>;
}
