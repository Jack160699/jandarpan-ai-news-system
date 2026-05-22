/**
 * AI-native newsroom layer types
 */

export type NewsSignalRow = {
  id: string;
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
  ingestion_metadata: Record<string, unknown>;
  created_at: string;
};

export type NewsSignalInsert = {
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
  ingestion_metadata?: Record<string, unknown>;
};

export type NewsEventRow = {
  id: string;
  canonical_title: string;
  event_summary: string | null;
  region: string | null;
  category: string | null;
  urgency_score: number;
  source_count: number;
  signal_ids: string[];
  clustering_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NewsEventInsert = {
  canonical_title: string;
  event_summary?: string | null;
  region?: string | null;
  category?: string | null;
  urgency_score?: number;
  source_count?: number;
  signal_ids?: string[];
  clustering_metadata?: Record<string, unknown>;
};

export type EditorialImageMeta = {
  source?: string;
  hero_url?: string;
  og_url?: string;
  prompt_hash?: string | null;
  status?: "queued" | "completed" | "failed";
  compressed?: boolean;
  moderation_flags?: string[];
  processed_at?: string;
};

export type EditorialMetadata = {
  ai_confidence?: number;
  quality_breakdown?: {
    structure: number;
    originality: number;
    readability: number;
    local_relevance: number;
    seo_quality: number;
  };
  rejection_reasons?: string[];
  repaired?: boolean;
  used_fallback?: boolean;
  batch_rescue?: boolean;
  image?: EditorialImageMeta;
  source_attribution?: Array<{
    signal_id: string;
    source: string | null;
    provider: string;
    article_url: string;
    published_at: string | null;
    confidence: number;
  }>;
  quality_report?: Record<string, unknown>;
  generated_at?: string;
  model?: string;
  event_id?: string;
  source_count?: number;
  structure?: string[];
};

export type EditorialArticleStatus = "pending" | "approved" | "rejected";

export type GeneratedArticleRow = {
  id: string;
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
  created_at: string;
};

export type GeneratedArticleInsert = {
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
  homepage_pin?: boolean;
  pinned_at?: string | null;
  reviewed_at?: string | null;
  editorial_metadata?: EditorialMetadata;
};
