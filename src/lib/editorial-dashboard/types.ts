/**
 * Editorial control dashboard types
 */

export type EditorialArticleStatus = "pending" | "approved" | "rejected";

export type DashboardIngestionLog = {
  id: string;
  status: string;
  inserted: number;
  total_fetched: number;
  failed_validation: number;
  duration_ms: number | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type DashboardSourceHealth = {
  source_id: string;
  name: string;
  tier: string;
  healthy: boolean;
  failures: number;
  consecutive_failures: number;
  disabled_until: string | null;
  last_success: string | null;
  avg_articles: number;
};

export type DashboardAiQueueItem = {
  id: string;
  article_id: number;
  status: string;
  error: string | null;
  created_at: string;
};

export type DashboardEventCluster = {
  id: string;
  canonical_title: string;
  region: string | null;
  category: string | null;
  urgency_score: number;
  source_count: number;
  signal_count: number;
  clustering_metadata: Record<string, unknown>;
  created_at: string;
};

export type DashboardSourceAttribution = {
  signal_id: string;
  source: string | null;
  provider: string;
  article_url: string;
  published_at: string | null;
  confidence: number;
};

export type DashboardGeneratedArticle = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  editorial_status: EditorialArticleStatus;
  workflow_status: string | null;
  homepage_pin: boolean;
  is_breaking: boolean;
  is_featured: boolean;
  published_at: string | null;
  ai_confidence: number | null;
  readability: number | null;
  seo_quality: number | null;
  local_relevance: number | null;
  originality: number | null;
  source_count: number | null;
  event_id: string | null;
  language: string | null;
  created_at: string;
  source_attribution: DashboardSourceAttribution[];
  hero_image_url: string | null;
  tags: string[];
  publish_decision: string | null;
  used_fallback: boolean;
  repaired: boolean;
  has_intelligence_v2: boolean;
  entity_names: string[];
  reader_keywords: string[];
  district: string | null;
  category_label: string | null;
};

export type DashboardImageQueueItem = {
  id: string;
  generated_article_id: string;
  status: string;
  attempts: number;
  image_source: string | null;
  error: string | null;
  created_at: string;
};

export type DashboardTrending = {
  topHeadlines: Array<{ headline: string; score: number }>;
  trendingSearches: string[];
  rankingAvg: number;
  breakingCount: number;
};

export type DashboardSourceReliability = {
  source: string;
  provider: string;
  avgConfidence: number;
  articleCount: number;
};

export type EditorialAuditEntry = {
  id: string;
  action: string;
  user_email: string | null;
  resource_id: string | null;
  created_at: string;
};

export type EditorialDashboardSnapshot = {
  fetchedAt: string;
  counts: {
    signals: number;
    events: number;
    generated: number;
    pending: number;
    approved: number;
    aiQueuePending: number;
    imageQueuePending: number;
    publishedToday: number;
    fallbackArticles: number;
    repairedArticles: number;
    eventLinkedArticles: number;
  };
  ingestion: {
    lastRun: DashboardIngestionLog | null;
    recentLogs: DashboardIngestionLog[];
    recentFailures: Array<{
      id: string;
      title: string | null;
      provider: string | null;
      reason: string;
      created_at: string;
    }>;
  };
  sourceHealth: DashboardSourceHealth[];
  aiQueue: DashboardAiQueueItem[];
  eventClusters: DashboardEventCluster[];
  generatedArticles: DashboardGeneratedArticle[];
  imageQueue: DashboardImageQueueItem[];
  trending: DashboardTrending;
  sourceReliability: DashboardSourceReliability[];
  auditTrail: EditorialAuditEntry[];
};
