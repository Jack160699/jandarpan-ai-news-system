/**
 * SERP Intelligence — shared types
 */

export type SerpFeatureType =
  | "top_stories"
  | "people_also_ask"
  | "image_pack"
  | "video"
  | "knowledge_panel"
  | "local_pack"
  | "news_box"
  | "featured_snippet";

export type SerpMovementType =
  | "new_ranking"
  | "dropped_ranking"
  | "improved_ranking"
  | "lost_ranking"
  | "unchanged";

export type SerpOpportunityType =
  | "striking_distance"
  | "weak_competitor_content"
  | "ctr_opportunity"
  | "missing_faq"
  | "missing_internal_links"
  | "missing_schema"
  | "high_search_opportunity"
  | "serp_feature_gap";

export type SerpActionType =
  | "improve_title"
  | "improve_meta"
  | "expand_article"
  | "create_faq"
  | "add_images"
  | "improve_internal_links"
  | "publish_supporting_article"
  | "create_topic_page";

export type SerpPriority = "high" | "medium" | "low";

export interface SerpOrganicResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  site?: string;
  publish_date?: string | null;
}

export interface SerpFeatures {
  top_stories: boolean;
  people_also_ask: boolean;
  image_pack: boolean;
  video: boolean;
  knowledge_panel: boolean;
  local_pack: boolean;
  news_box: boolean;
  featured_snippet: boolean;
  /** Which domains own SERP features */
  feature_owners: Partial<Record<SerpFeatureType, string[]>>;
  /** Raw PAA questions when available */
  paa_questions?: string[];
}

export interface SerpCollectedSnapshot {
  keyword: string;
  provider: string;
  organic_results: SerpOrganicResult[];
  serp_features: SerpFeatures;
  raw_metadata?: Record<string, unknown>;
}

export interface SerpKeywordRecord {
  id: string;
  keyword: string;
  group_name: string;
  language: string;
  region: string;
  enabled: boolean;
  is_custom: boolean;
}

export interface SerpRankingRecord {
  keyword_id: string;
  url: string;
  domain: string;
  title: string | null;
  snippet: string | null;
  site: string | null;
  publish_date: string | null;
  position: number;
  previous_position: number | null;
  position_delta: number | null;
  is_jandarpan: boolean;
  competitor_key: string | null;
  first_seen: string;
  last_seen: string;
  best_rank: number | null;
  worst_rank: number | null;
  ranking_history: Array<{ position: number; captured_at: string }>;
}

export interface SerpMovementRecord {
  keyword_id: string;
  url: string;
  domain: string;
  movement_type: SerpMovementType;
  previous_position: number | null;
  current_position: number | null;
  position_delta: number | null;
  is_jandarpan: boolean;
  metadata?: Record<string, unknown>;
}

export interface SerpOpportunityRecord {
  keyword_id: string;
  opportunity_type: SerpOpportunityType;
  action_type?: SerpActionType;
  priority: SerpPriority;
  title: string;
  reason: string;
  current_position?: number | null;
  jandarpan_url?: string | null;
  scores?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface CompetitorShareStats {
  domain: string;
  competitor_name: string;
  top10_count: number;
  top3_count: number;
  share_top10: number;
  share_top3: number;
  average_position: number;
  position_delta_avg: number;
}

export interface SerpFeatureOwnership {
  feature: SerpFeatureType;
  appearance_rate: number;
  owners: Array<{ domain: string; count: number }>;
  jandarpan_qualifies: boolean;
  recommendation: string;
}

export interface SerpAiAction {
  action_type: SerpActionType;
  priority: SerpPriority;
  title: string;
  reason: string;
  keyword: string;
  keyword_id: string;
  current_position?: number;
  jandarpan_url?: string;
}

export type SerpIntelligenceMode = "hybrid" | "gsc_only";

export interface SerpQuotaStatus {
  monthlyLimit: number;
  reservedSearches: number;
  usableMonthlyLimit: number;
  searchesUsed: number;
  searchesRemaining: number;
  searchesSkipped: number;
  keywordsCheckedToday: number;
  dailyMax: number;
  dailyUsed: number;
  dailyRemaining: number;
  canSearch: boolean;
  quotaExhausted: boolean;
  mode: SerpIntelligenceMode;
  periodMonth: string;
  estimatedResetAt: string;
}

export interface PrioritizedKeyword {
  keyword: SerpKeywordRecord;
  priorityScore: number;
  signals: {
    gscImpressions?: number;
    gscClicks?: number;
    rankingDrop?: number;
    gscTrend?: string;
    competitorGapScore?: number;
  };
}

export interface SerpRankingsDashboard {
  quota: SerpQuotaStatus;
  visibilityScore: number;
  averagePosition: number | null;
  keywordsTracked: number;
  keywordsRanking: number;
  lastTrackingAt: string | null;
  topOpportunities: SerpOpportunityRecord[];
  biggestWinners: Array<{
    keyword: string;
    url: string;
    previous_position: number;
    current_position: number;
    position_delta: number;
  }>;
  biggestLosers: Array<{
    keyword: string;
    url: string;
    previous_position: number;
    current_position: number;
    position_delta: number;
  }>;
  topCompetitors: CompetitorShareStats[];
  serpFeatureOwnership: SerpFeatureOwnership[];
  keywordTrends: Array<{
    keyword: string;
    group_name: string;
    current_position: number | null;
    previous_position: number | null;
    movement: SerpMovementType | "not_ranking";
  }>;
  jandarpanRankings: Array<{
    keyword: string;
    group_name: string;
    position: number;
    url: string;
    title: string | null;
    position_delta: number | null;
  }>;
}

export interface SerpTrackerResult {
  ok: boolean;
  status: "completed" | "skipped" | "failed";
  durationMs: number;
  keywordsProcessed: number;
  snapshotsSaved: number;
  rankChanges: number;
  newKeywords: number;
  lostKeywords: number;
  opportunitiesFound: number;
  serpSearchesPerformed: number;
  serpSearchesSkipped: number;
  intelligenceMode: SerpIntelligenceMode;
  quota: SerpQuotaStatus;
  errors: string[];
  skippedReason?: string;
}
