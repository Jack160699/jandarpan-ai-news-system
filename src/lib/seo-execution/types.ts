/**
 * SEO Execution Engine — shared types
 */

export type SuggestionStatus = "pending" | "approved" | "rejected" | "applied";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type SuggestionPriority = "high" | "medium" | "low";

export type SuggestionType =
  | "title_primary"
  | "title_alt_a"
  | "title_alt_b"
  | "title_breaking"
  | "title_discover"
  | "title_google_news"
  | "meta_title"
  | "meta_description"
  | "og_title"
  | "og_description"
  | "twitter_title"
  | "twitter_description"
  | "slug_recommendation"
  | "internal_link"
  | "faq"
  | "expansion"
  | "image_alt"
  | "image_caption"
  | "image_title"
  | "image_description"
  | "og_image";

export interface ArticleAuditScores {
  seoScore: number;
  headlineScore: number;
  ctrScore: number;
  googleNewsScore: number;
  readability: number;
  entityCoverage: number;
  keywordCoverage: number;
  internalLinkingScore: number;
  schemaScore: number;
  imageScore: number;
  overallScore: number;
  explanations: Record<string, string>;
}

export interface ExecutionArticle {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  seo_title: string | null;
  seo_description: string | null;
  article_body: string | null;
  hero_image_url: string | null;
  tags: string[];
  district: string | null;
  category: string | null;
  published_at: string | null;
  editorial_metadata: Record<string, unknown>;
  word_count: number;
}

export interface IntelligenceContext {
  competitorHeadlines: string[];
  seoGaps: string[];
  serpOpportunities: string[];
  gscQueries: Array<{ query: string; clicks: number; position: number }>;
}

export interface SuggestionDraft {
  suggestion_type: SuggestionType;
  field_key: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
  expected_impact: string;
  confidence: number;
  priority: SuggestionPriority;
  metadata?: Record<string, unknown>;
}

export interface ExecutionSuggestion {
  id: string;
  job_id: string;
  generated_article_id: string;
  suggestion_type: SuggestionType;
  field_key: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
  expected_impact: string;
  confidence: number;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExecutionJob {
  id: string;
  generated_article_id: string;
  article_slug: string;
  status: JobStatus;
  audit_scores: ArticleAuditScores;
  overall_score: number | null;
  triggered_by: string | null;
  completed_at: string | null;
  created_at: string;
  suggestions: ExecutionSuggestion[];
}

export interface ExecutionDashboard {
  jobs: ExecutionJob[];
  pendingCount: number;
  appliedCount: number;
  recentArticles: Array<{
    id: string;
    slug: string;
    headline: string;
    lastAuditAt: string | null;
    overallScore: number | null;
  }>;
}

export interface ApplyResult {
  ok: boolean;
  historyId?: string;
  appliedCount: number;
  errors: string[];
}

export interface AuditResult {
  ok: boolean;
  jobId?: string;
  suggestionCount: number;
  audit?: ArticleAuditScores;
  errors: string[];
}

export interface ArticleSeoSnapshot {
  headline: string;
  seo_title: string | null;
  seo_description: string | null;
  slug: string;
  editorial_metadata: Record<string, unknown>;
}
