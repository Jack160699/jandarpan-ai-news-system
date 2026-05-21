/**
 * Supabase clients — Phase 1 news ingestion
 *
 * Architecture:
 * - `createBrowserClient()` — anon key, safe for client components (read-only via RLS)
 * - `createAdminClient()` — service role, server-only (API routes, cron upserts)
 * - `createServerAnonClient()` — anon key on server for RSC data fetching
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NewsArticleRow } from "@/lib/types/news-article";

import type { NewsArticleInsert } from "@/lib/types/news-article";

export type Database = {
  public: {
    Tables: {
      news_articles: {
        Row: NewsArticleRow;
        Insert: NewsArticleInsert;
        Update: Partial<NewsArticleInsert>;
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

/** Browser / public read client */
export function createBrowserClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: false },
  });
}

/** Server Components — read published articles */
export function createServerAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: false },
  });
}

/** API routes & cron — bypass RLS for inserts */
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
