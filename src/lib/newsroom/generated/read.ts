/**
 * Read published generated_articles — homepage + story source of truth
 */

import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { logNewsroom } from "@/lib/newsroom/logger";
import {
  isPublicGeneratedArticle,
  PUBLIC_EDITORIAL_STATUSES,
} from "@/lib/newsroom/publish-state";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const GENERATED_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,workflow_status,homepage_pin,pinned_at,editorial_metadata,created_at";

const MIN_POOL_LOG = 3;

/** Event id suffix embedded in SEO slugs (`optimizeSeoSlug`). */
export function extractGeneratedSlugSuffix(slug: string): string | null {
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  const match = decoded.match(/-([a-f0-9]{8})$/i);
  return match?.[1] ?? null;
}

function mapGeneratedRow(
  row: Record<string, unknown>
): GeneratedArticleRow {
  return {
    ...row,
    editorial_metadata:
      (row.editorial_metadata as GeneratedArticleRow["editorial_metadata"]) ?? {},
  } as unknown as GeneratedArticleRow;
}

function publicGeneratedQuery(supabase: ReturnType<typeof createAnonServerClient>) {
  return supabase
    .from("generated_articles")
    .select(GENERATED_SELECT)
    .not("published_at", "is", null)
    .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES]);
}

async function fetchPublicGeneratedRow(
  supabase: ReturnType<typeof createAnonServerClient>,
  slug: string
): Promise<GeneratedArticleRow | null> {
  const decoded = decodeURIComponent(slug).trim();

  const { data: exact, error: exactError } = await publicGeneratedQuery(supabase)
    .eq("slug", decoded)
    .maybeSingle();

  if (exactError) {
    errorLiveFeed("generated_slug_exact_error", { slug: decoded, message: exactError.message });
  }
  if (exact) return mapGeneratedRow(exact);

  const { data: ciMatch } = await publicGeneratedQuery(supabase)
    .ilike("slug", decoded)
    .limit(1)
    .maybeSingle();

  if (ciMatch) return mapGeneratedRow(ciMatch);

  const suffix = extractGeneratedSlugSuffix(decoded);
  if (!suffix) return null;

  const { data: suffixMatch } = await publicGeneratedQuery(supabase)
    .ilike("slug", `%-${suffix}`)
    .limit(1)
    .maybeSingle();

  if (suffixMatch) {
    logLiveFeed("generated_slug_suffix_resolved", {
      requested: decoded,
      resolved: suffixMatch.slug,
      suffix,
    });
    return mapGeneratedRow(suffixMatch);
  }

  return null;
}

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
    .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
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

  const publicRows = rows.filter((row) => isPublicGeneratedArticle(row));

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

  const supabase = createAnonServerClient();
  return fetchPublicGeneratedRow(supabase, slug);
}

export async function getGeneratedArticleSlugs(
  limit = 200
): Promise<string[]> {
  const pool = await fetchGeneratedArticlePool(limit);
  return pool.map((r) => r.slug).filter(Boolean);
}
