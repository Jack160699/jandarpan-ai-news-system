/**
 * Supabase database types
 */

import type { NewsArticleRow, NewsArticleInsert } from "@/lib/types/news-article";
import type {
  GeneratedArticleRow,
  GeneratedArticleInsert,
  NewsEventRow,
  NewsEventInsert,
  NewsSignalRow,
  NewsSignalInsert,
} from "@/lib/types/newsroom";

export type IngestionLogRow = {
  id: string;
  status: string;
  total_fetched: number;
  total_valid: number;
  inserted: number;
  skipped_duplicates: number;
  failed_validation: number;
  category_stats: Record<string, number> | null;
  provider_stats: Record<string, number> | null;
  provider_errors: string[] | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type IngestionFailureRow = {
  id: string;
  title: string | null;
  article_url: string | null;
  provider: string | null;
  reason: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type RssSourceHealthRow = {
  source_id: string;
  name: string;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  consecutive_failures: number;
  disabled_until: string | null;
  updated_at: string;
};

export type NewsAiQueueRow = {
  id: string;
  article_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  processed_at: string | null;
  error: string | null;
};

export type EditorialImageQueueRow = {
  id: string;
  generated_article_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  max_attempts: number;
  prompt_hash: string | null;
  hero_image_url: string | null;
  og_image_url: string | null;
  image_source: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      news_articles: {
        Row: NewsArticleRow;
        Insert: NewsArticleInsert;
        Update: Partial<NewsArticleInsert>;
        Relationships: [];
      };
      ingestion_logs: {
        Row: IngestionLogRow;
        Insert: Partial<IngestionLogRow>;
        Update: Partial<IngestionLogRow>;
        Relationships: [];
      };
      ingestion_failures: {
        Row: IngestionFailureRow;
        Insert: Partial<IngestionFailureRow>;
        Update: Partial<IngestionFailureRow>;
        Relationships: [];
      };
      rss_source_health: {
        Row: RssSourceHealthRow;
        Insert: Partial<RssSourceHealthRow>;
        Update: Partial<RssSourceHealthRow>;
        Relationships: [];
      };
      news_ai_queue: {
        Row: NewsAiQueueRow;
        Insert: Partial<NewsAiQueueRow>;
        Update: Partial<NewsAiQueueRow>;
        Relationships: [];
      };
      news_signals: {
        Row: NewsSignalRow;
        Insert: NewsSignalInsert;
        Update: Partial<NewsSignalInsert>;
        Relationships: [];
      };
      news_events: {
        Row: NewsEventRow;
        Insert: NewsEventInsert;
        Update: Partial<NewsEventInsert>;
        Relationships: [];
      };
      generated_articles: {
        Row: GeneratedArticleRow;
        Insert: GeneratedArticleInsert;
        Update: Partial<GeneratedArticleInsert>;
        Relationships: [];
      };
      editorial_image_queue: {
        Row: EditorialImageQueueRow;
        Insert: Partial<EditorialImageQueueRow>;
        Update: Partial<EditorialImageQueueRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

/** Safe column list for anon reads (matches minimal + extended schemas) */
export const CORE_ARTICLE_SELECT =
  "id,title,description,content,image_url,source,author,category,article_url,slug,published_at,created_at";

export const EXTENDED_ARTICLE_SELECT =
  `${CORE_ARTICLE_SELECT},updated_at,provider,language,region,title_hash,url_hash,ai_summary,ai_headline,ai_processed_at`;
