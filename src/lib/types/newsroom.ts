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
};

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
};
