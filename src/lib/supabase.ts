/**
 * Supabase clients — hybrid news ingestion
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NewsArticleRow, NewsArticleInsert } from "@/lib/types/news-article";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server only)");
  }
  return key;
}

export function createBrowserClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: false },
  });
}

export function createServerAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: false },
  });
}

export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
