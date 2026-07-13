/**
 * Read published generated_articles — homepage + story source of truth
 */

import { getStaticFallbackArticleBySlug } from "@/lib/news/fallback/wire-articles";
import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { logNewsroom } from "@/lib/newsroom/logger";
import {
  isPublicGeneratedArticle,
  PUBLIC_EDITORIAL_STATUSES,
} from "@/lib/newsroom/publish-state";
import {
  getGoogleNewsCutoffIso,
  GOOGLE_NEWS_SITEMAP_LIMIT,
} from "@/lib/seo/google-news";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const GENERATED_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,workflow_status,homepage_pin,pinned_at,editorial_metadata,geo_metadata,shorts_metadata,created_at";

/** Homepage ranking uses headline/summary/metadata — omits heavy article_body payloads. */
export const GENERATED_SELECT_HOMEPAGE =
  "id,event_id,slug,headline,summary,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,workflow_status,homepage_pin,pinned_at,editorial_metadata,created_at";

/** Google News sitemap — only fields required for news:news entries. */
const GOOGLE_NEWS_SELECT = "slug,headline,published_at,language,editorial_status,workflow_status";

export type GeneratedPoolSelect = "full" | "homepage";

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
  limit = 280,
  options?: { select?: GeneratedPoolSelect }
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

  const { data, error } =
    options?.select === "homepage"
      ? await supabase
          .from("generated_articles")
          .select(GENERATED_SELECT_HOMEPAGE)
          .not("published_at", "is", null)
          .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(limit)
      : await supabase
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

export type GoogleNewsArticleRow = Pick<
  GeneratedArticleRow,
  "slug" | "headline" | "published_at" | "language"
>;

/**
 * Published generated_articles from the last 48 hours — Google News sitemap source.
 * Filters at the database layer instead of fetching a broad pool and discarding rows.
 */
export async function fetchGoogleNewsArticlePool(
  limit = GOOGLE_NEWS_SITEMAP_LIMIT,
  now = new Date()
): Promise<GoogleNewsArticleRow[]> {
  if (!isSupabaseConfigured()) {
    warnLiveFeed("google_news_pool_skip", {
      reason: "supabase_not_configured",
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel",
    });
    return [];
  }

  const supabase = createAnonServerClient();
  const startedAt = Date.now();
  const cutoffIso = getGoogleNewsCutoffIso(now);

  const { data, error } = await supabase
    .from("generated_articles")
    .select(GOOGLE_NEWS_SELECT)
    .not("published_at", "is", null)
    .gte("published_at", cutoffIso)
    .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    errorLiveFeed("google_news_pool_query_error", {
      message: error.message,
      code: error.code,
      hint: error.hint,
      cutoffIso,
      durationMs: Date.now() - startedAt,
    });
    logNewsroom("generated", "fetch_google_news_pool_failed", {
      error: error.message,
      cutoffIso,
    });
    return [];
  }

  const rows = (data ?? []).filter(
    (row) =>
      isPublicGeneratedArticle(row) &&
      Boolean(row.slug?.trim()) &&
      Boolean(row.headline?.trim()) &&
      Boolean(row.published_at)
  );

  logLiveFeed("google_news_pool", {
    eligibleCount: rows.length,
    cutoffIso,
    durationMs: Date.now() - startedAt,
  });

  logNewsroom("generated", "fetch_google_news_pool", {
    count: rows.length,
    cutoffIso,
  });

  return rows as GoogleNewsArticleRow[];
}

export async function getGeneratedArticleBySlug(
  slug: string
): Promise<GeneratedArticleRow | null> {
  if (isSupabaseConfigured()) {
    const supabase = createAnonServerClient();
    const row = await fetchPublicGeneratedRow(supabase, slug);
    if (row) return row;
  }

  const fallback = getStaticFallbackArticleBySlug(slug);
  if (fallback) {
    warnLiveFeed("generated_slug_static_fallback", { slug });
  }
  return fallback;
}

export async function getGeneratedArticleSlugs(
  limit = 200
): Promise<string[]> {
  const pool = await fetchGeneratedArticlePool(limit);
  return pool.map((r) => r.slug).filter(Boolean);
}
