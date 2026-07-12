/**
 * SEO Intelligence Engine — shared types (Phase 11B)
 */

export type SeoPriority = "high" | "medium" | "low";
export type SeoTrend = "rising" | "stable" | "declining";
export type TopicTrend = "breaking" | "trending" | "growing" | "declining";
export type GapType =
  | "missing_story"
  | "similar_story"
  | "duplicate_topic"
  | "missing_district"
  | "missing_category"
  | "missing_keyword"
  | "missing_faq";

export type RecommendationType =
  | "publish_story"
  | "update_article"
  | "improve_title"
  | "add_faq"
  | "improve_internal_links"
  | "high_priority_district"
  | "trending_keyword";

export type EntityType =
  | "keyword"
  | "person"
  | "location"
  | "organization"
  | "scheme";

export type AnalysisCompetitorArticle = {
  id: string;
  source_id: string;
  source_name?: string;
  url: string;
  title: string;
  description: string | null;
  category: string | null;
  district: string | null;
  published_at: string | null;
  fetched_at: string;
  word_count: number | null;
  headings: string[];
  open_graph: Record<string, string>;
  schema_detected: Record<string, unknown>;
};

export type AnalysisJandarpanArticle = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  published_at: string | null;
  district: string | null;
  category: string | null;
  word_count: number | null;
  hero_image_url: string | null;
  editorial_metadata: Record<string, unknown>;
};

export type AnalysisSnapshot = {
  competitorArticles: AnalysisCompetitorArticle[];
  jandarpanArticles: AnalysisJandarpanArticle[];
  loadedAt: string;
};

export type KeywordIntelligenceRecord = {
  keyword: string;
  frequency: number;
  trend: SeoTrend;
  competitors_using: string[];
  district: string | null;
  entity_type: EntityType;
  last_seen: string;
  metadata?: Record<string, unknown>;
};

export type GapReportRecord = {
  competitor_article_id: string | null;
  generated_article_id: string | null;
  generated_article_slug: string | null;
  gap_type: GapType;
  gap_score: number;
  priority: SeoPriority;
  reason: string;
  district: string | null;
  category: string | null;
  keyword: string | null;
  metadata?: Record<string, unknown>;
};

export type DistrictCoverageRecord = {
  district: string;
  districtName: string;
  competitorArticlesToday: number;
  jandarpanArticlesToday: number;
  coveragePercent: number;
  missingStories: number;
  trendScore: number;
  recommendation: string;
};

export type HeadlineAnalysis = {
  headline: string;
  length: number;
  keywordPosition: number | null;
  districtPosition: number | null;
  hasNumber: boolean;
  powerWordCount: number;
  isQuestion: boolean;
  hasBreakingPrefix: boolean;
  headlineScore: number;
  ctrPrediction: number;
  seoScore: number;
};

export type SeoScorecard = {
  articleSlug: string;
  headline: string;
  seoScore: number;
  readability: number;
  keywordOptimization: number;
  titleQuality: number;
  descriptionQuality: number;
  schemaCompleteness: number;
  internalLinking: number;
  imageOptimization: number;
};

export type TrendingTopicRecord = {
  topic: string;
  cluster_key: string;
  trend: TopicTrend;
  article_count: number;
  competitor_count: number;
  district: string | null;
  keywords: string[];
  score: number;
  last_seen: string;
  metadata?: Record<string, unknown>;
};

export type RecommendationRecord = {
  type: RecommendationType;
  priority: SeoPriority;
  title: string;
  reason: string;
  district: string | null;
  keyword: string | null;
  article_slug: string | null;
  competitor_article_id: string | null;
  scores: Record<string, number>;
  metadata?: Record<string, unknown>;
};

export type SeoIntelligenceResult = {
  ok: boolean;
  status: "completed" | "failed" | "skipped";
  durationMs: number;
  gapsFound: number;
  keywordsUpdated: number;
  recommendationsGenerated: number;
  trendingTopics: number;
  seoHealthScore: number;
  coveragePercent: number;
  errors: string[];
  skippedReason?: string;
};

export type SeoIntelligenceDashboard = {
  seoHealth: number;
  coveragePercent: number;
  districtCoverage: DistrictCoverageRecord[];
  trendingKeywords: KeywordIntelligenceRecord[];
  missingStories: GapReportRecord[];
  competitorAdvantage: number;
  headlineScores: HeadlineAnalysis[];
  recommendations: RecommendationRecord[];
  trendingTopics: TrendingTopicRecord[];
  lastAnalysisAt: string | null;
};
