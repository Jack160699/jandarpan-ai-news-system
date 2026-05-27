/**
 * Read published generated_articles — homepage + story source of truth
 */

import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const GENERATED_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,workflow_status,homepage_pin,pinned_at,editorial_metadata,created_at";

const MIN_POOL_LOG = 3;

export async function fetchGeneratedArticlePool(
  limit = 280
): Promise<GeneratedArticleRow[]> {
  if (!isSupabaseConfigured()) {
    warnLiveFeed("generated_pool_skip", {
      reason: "supabase_not_configured",
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel",
    });
    return [];
  }

  const supabase = createAnonServerClient();
  const startedAt = Date.now();

  const { data, error } = await supabase
    .from("generated_articles")
    .select(GENERATED_SELECT)
    .not("published_at", "is", null)
    .in("editorial_status", ["approved", "published", "live"])
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    errorLiveFeed("generated_pool_query_error", {
      message: error.message,
      code: error.code,
      hint: error.hint,
      durationMs: Date.now() - startedAt,
    });
    logNewsroom("generated", "fetch_pool_failed", { error: error.message });
    return [];
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    editorial_metadata: row.editorial_metadata ?? {},
  }));

  const publicRows = rows.filter((row) => {
    const status = row.editorial_status ?? "approved";
    const workflow = (row as { workflow_status?: string }).workflow_status;
    if (workflow && workflow !== "published") return false;
    if (status === "rejected" || status === "pending") return false;
    return Boolean(row.published_at);
  });

  logLiveFeed("generated_pool", {
    publicCount: publicRows.length,
    rawCount: rows.length,
    durationMs: Date.now() - startedAt,
  });

  if (publicRows.length < MIN_POOL_LOG) {
    warnLiveFeed("generated_pool_sparse", {
      publicCount: publicRows.length,
      hint: "Run /api/cron/orchestrate or /api/fetch-news with CRON_SECRET; check RLS on generated_articles",
    });
  }

  logNewsroom("generated", "fetch_pool", {
    count: publicRows.length,
    total: rows.length,
  });
  return publicRows as unknown as GeneratedArticleRow[];
}

export async function getGeneratedArticleBySlug(
  slug: string
): Promise<GeneratedArticleRow | null> {
  if (!isSupabaseConfigured()) return null;

  const decoded = decodeURIComponent(slug);
  const supabase = createAnonServerClient();

  const { data, error } = await supabase
    .from("generated_articles")
    .select(GENERATED_SELECT)
    .eq("slug", decoded)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    editorial_metadata: data.editorial_metadata ?? {},
  } as unknown as GeneratedArticleRow;
}

export async function getGeneratedArticleSlugs(
  limit = 200
): Promise<string[]> {
  const pool = await fetchGeneratedArticlePool(limit);
  return pool.map((r) => r.slug).filter(Boolean);
}
