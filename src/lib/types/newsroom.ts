/**
 * AI-native newsroom layer types
 */

import type { Json } from "@/types/supabase";
import type { JsonObject } from "@/types/json";
import type { RegionalGeoMetadata } from "@/lib/regional/geo-tagging";

export type NewsSignalRow = {
  id: string;
  tenant_id?: string | null;
  source: string | null;
  provider: string;
  title: string;
  raw_content: string | null;
  article_url: string;
  image_url: string | null;
  published_at: string | null;
  category: string;
  region: string | null;
  language: string | null;
  ingestion_metadata: Json;
  geo_metadata?: Json | RegionalGeoMetadata;
  created_at: string;
};

export type NewsSignalInsert = {
  tenant_id?: string | null;
  source?: string | null;
  provider: string;
  title: string;
  raw_content?: string | null;
  article_url: string;
  image_url?: string | null;
  published_at?: string | null;
  category: string;
  region?: string | null;
  language?: string | null;
  ingestion_metadata?: JsonObject;
  geo_metadata?: RegionalGeoMetadata | Json;
};

export type NewsEventRow = {
  id: string;
  tenant_id?: string | null;
  canonical_title: string;
  event_summary: string | null;
  region: string | null;
  category: string | null;
  urgency_score: number;
  source_count: number;
  signal_ids: string[];
  clustering_metadata: Json;
  /** Present on in-memory rows; persisted inside clustering_metadata in DB */
  geo_metadata?: RegionalGeoMetadata | Json;
  coverage_slug: string | null;
  coverage_headline: string | null;
  cluster_confidence: number | null;
  is_live: boolean;
  coverage_status: string;
  created_at: string;
  updated_at: string;
};

export type NewsEventInsert = {
  tenant_id?: string | null;
  canonical_title: string;
  event_summary?: string | null;
  region?: string | null;
  category?: string | null;
  urgency_score?: number;
  source_count?: number;
  signal_ids?: string[];
  clustering_metadata?: JsonObject;
  coverage_slug?: string | null;
  coverage_headline?: string | null;
  cluster_confidence?: number | null;
  is_live?: boolean;
  coverage_status?: string;
  updated_at?: string;
};

export type CoverageUpdateRow = {
  id: string;
  event_id: string;
  update_type: string;
  headline: string;
  summary: string | null;
  signal_ids: string[];
  source_attribution: Json;
  cluster_confidence: number | null;
  is_breaking: boolean;
  published_at: string;
  created_at: string;
};

export type CoverageUpdateInsert = {
  event_id: string;
  update_type?: string;
  headline: string;
  summary?: string | null;
  signal_ids?: string[];
  source_attribution?: Json;
  cluster_confidence?: number | null;
  is_breaking?: boolean;
  published_at?: string;
};

export type EditorialImageMeta = {
  source?: string;
  hero_url?: string;
  og_url?: string;
  prompt_hash?: string | null;
  visual_hash?: string | null;
  quality_score?: number;
  quality_flags?: string[];
  fallback_tier?: string;
  responsive_sizes?: string;
  width?: number;
  height?: number;
  mobile_width?: number;
  mobile_height?: number;
  repair_attempts?: number;
  status?: "queued" | "completed" | "failed" | "repaired";
  compressed?: boolean;
  storage_path?: string | null;
  moderation_flags?: string[];
  processed_at?: string;
  prompt?: string | null;
  theme?: string;
  district?: string | null;
  provider?: string;
  model?: string;
  approval_status?: string;
};

export type EditorialMetadata = {
  ai_confidence?: number;
  /** Back-compat: some modules read derived values at top-level. */
  local_relevance?: number;
  /** Breaking-news immediate publish override flag. */
  breaking_override?: boolean;
  quality_breakdown?: {
    structure: number;
    originality: number;
    readability: number;
    local_relevance: number;
    seo_quality: number;
    breaking_score?: number;
    trend_score?: number;
    headline_quality?: number;
    spam_score?: number;
    source_overlap?: number;
  };
  duplicate_cluster_id?: string | null;
  breaking_score?: number;
  trend_score?: number;
  headline_quality?: number;
  spam_score?: number;
  publish_decision?: string;
  is_breaking?: boolean;
  is_featured?: boolean;
  breaking_marked_at?: string | null;
  regenerated_at?: string | null;
  rejection_reasons?: string[];
  repaired?: boolean;
  used_fallback?: boolean;
  batch_rescue?: boolean;
  image?: EditorialImageMeta;
  /** Timeline of material updates to an already-published story */
  updates?: Array<{
    timestamp: string;
    signal_ids: string[];
    summary: string;
    source_urls?: string[];
  }>;
  /** Last signal/URL checkpoint used to detect material updates */
  update_checkpoint?: {
    at?: string;
    source_urls?: string[];
    signal_ids?: string[];
  };
  /** ISO timestamp of last material editorial update (metadata-only; no DB column) */
  date_modified?: string;
  source_attribution?: Array<{
    signal_id: string;
    source: string | null;
    provider: string;
    article_url: string;
    published_at: string | null;
    confidence: number;
  }>;
  quality_report?: JsonObject;
  generated_at?: string;
  model?: string;
  event_id?: string;
  source_count?: number;
  structure?: string[];
  regional?: RegionalGeoMetadata;
  regional_topic_score?: number;
  translations?: import("@/lib/i18n/multilingual/types").ArticleTranslations;
  translations_updated_at?: string;
  shorts?: import("@/lib/news/shorts/types").NewsShortBundle;
  intelligence_v1?: {
    enrichedAt?: string;
    deskSummary?: string;
    fakeNewsRisk?: number;
    duplicateClusterId?: string | null;
    breakingScore?: number;
    trendScore?: number;
    checks_run?: string[];
  };
  intelligence_v2?: import("@/lib/news/ai/editorial-intelligence-v2").EditorialIntelligenceV2;
};

export type EditorialArticleStatus = "pending" | "approved" | "rejected";

export type GeneratedArticleRow = {
  id: string;
  tenant_id?: string | null;
  event_id: string | null;
  slug: string;
  headline: string;
  summary: string | null;
  article_body: string | null;
  hero_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time: string | null;
  language: string | null;
  tags: string[];
  published_at: string | null;
  editorial_status?: EditorialArticleStatus;
  homepage_pin?: boolean;
  pinned_at?: string | null;
  editorial_metadata: EditorialMetadata;
  geo_metadata?: RegionalGeoMetadata | Json;
  shorts_metadata?: import("@/lib/news/shorts/types").NewsShortBundle;
  translations?: Json | null;
  created_at: string;
};

export type GeneratedArticleInsert = {
  tenant_id?: string | null;
  event_id?: string | null;
  slug: string;
  headline: string;
  summary?: string | null;
  article_body?: string | null;
  hero_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  reading_time?: string | null;
  language?: string | null;
  tags?: string[];
  published_at?: string | null;
  editorial_status?: EditorialArticleStatus;
  workflow_status?: string;
  homepage_pin?: boolean;
  pinned_at?: string | null;
  reviewed_at?: string | null;
  editorial_metadata?: EditorialMetadata | Json;
  geo_metadata?: RegionalGeoMetadata | Json;
  shorts_metadata?: import("@/lib/news/shorts/types").NewsShortBundle;
  translations?: Json;
};
