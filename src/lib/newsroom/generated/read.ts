/**
 * Read published generated_articles — homepage + story source of truth.
 * Phase 6: bounded limits, strict projections, no body on sitemap/health paths.
 */

import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase/safe-query";
import { logNewsroom } from "@/lib/newsroom/logger";
import {
  isPublicGeneratedArticle,
  PUBLIC_EDITORIAL_STATUSES,
} from "@/lib/newsroom/publish-state";
import {
  clampGeneratedPoolLimit,
  GENERATED_POOL_HARD_CAPS,
  isStatementTimeoutError,
  type GeneratedPoolSelectMode,
} from "@/lib/newsroom/generated/pool-limits";
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

/** Main sitemap — slug + stable lastmod only. */
export const GENERATED_SELECT_SITEMAP =
  "slug,published_at,created_at,editorial_status,workflow_status";

/** Slug listing — no body, no summary. */
export const GENERATED_SELECT_SLUG =
  "slug,published_at,editorial_status,workflow_status";

/** Google News sitemap — only fields required for news:news entries. */
const GOOGLE_NEWS_SELECT =
  "slug,headline,published_at,language,editorial_status,workflow_status";

export type GeneratedPoolSelect = GeneratedPoolSelectMode;

const MIN_POOL_LOG = 3;
const POOL_QUERY_TIMEOUT_MS = 4_000;

function selectColumns(mode: GeneratedPoolSelectMode): string {
  switch (mode) {
    case "homepage":
      return GENERATED_SELECT_HOMEPAGE;
    case "sitemap":
      return GENERATED_SELECT_SITEMAP;
    case "slug":
      return GENERATED_SELECT_SLUG;
    case "summary":
      return "id,published_at,editorial_status";
    case "full":
    default:
      return GENERATED_SELECT;
  }
}

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
    errorLiveFeed("generated_slug_exact_error", {
      slug: decoded,
      message: exactError.message,
    });
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

export type FetchGeneratedArticlePoolOptions = {
  select?: GeneratedPoolSelect;
  /** Keyset cursor: return rows older than this published_at ISO timestamp. */
  cursorPublishedAt?: string;
};

export async function fetchGeneratedArticlePool(
  limit = 280,
  options?: FetchGeneratedArticlePoolOptions
): Promise<GeneratedArticleRow[]> {
  if (!isSupabaseConfigured()) {
    warnLiveFeed("generated_pool_skip", {
      reason: "supabase_not_configured",
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel",
    });
    return [];
  }

  const mode: GeneratedPoolSelectMode = options?.select ?? "full";
  const bounded = clampGeneratedPoolLimit(limit, mode);
  const columns = selectColumns(mode);
  const supabase = createAnonServerClient();
  const startedAt = Date.now();

  const result = await safeQuery<Record<string, unknown>[]>(
    async () => {
      let q = supabase
        .from("generated_articles")
        .select(columns)
        .not("published_at", "is", null)
        .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
        .order("published_at", { ascending: false, nullsFirst: false });

      if (options?.cursorPublishedAt) {
        q = q.lt("published_at", options.cursorPublishedAt);
      }

      const res = await q.limit(bounded);
      return { data: (res.data ?? null) as Record<string, unknown>[] | null, error: res.error };
    },
    {
      label: `generated_pool_${mode}`,
      timeoutMs: POOL_QUERY_TIMEOUT_MS,
      retries: 0,
    }
  );

  if (!result.ok) {
    const timedOut = isStatementTimeoutError(result.error.message);
    errorLiveFeed("generated_pool_query_error", {
      message: result.error.message,
      code: result.error.postgrest?.code,
      timedOut,
      select: mode,
      limit: bounded,
      durationMs: Date.now() - startedAt,
    });
    logNewsroom("generated", "fetch_pool_failed", {
      error: result.error.message,
      timedOut,
      select: mode,
    });
    return [];
  }

  const rows = (result.data ?? []).map((row) =>
    mapGeneratedRow({
      ...row,
      editorial_metadata: row.editorial_metadata ?? {},
    })
  );

  const publicRows = rows.filter((row) => isPublicGeneratedArticle(row));

  logLiveFeed("generated_pool", {
    publicCount: publicRows.length,
    rawCount: rows.length,
    select: mode,
    limit: bounded,
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
    select: mode,
    limit: bounded,
  });
  return publicRows;
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

  const bounded = Math.min(
    Math.max(1, Math.floor(limit)),
    GENERATED_POOL_HARD_CAPS.googleNews
  );
  const supabase = createAnonServerClient();
  const startedAt = Date.now();
  const cutoffIso = getGoogleNewsCutoffIso(now);

  const result = await safeQuery<GoogleNewsArticleRow[]>(
    async () => {
      const res = await supabase
        .from("generated_articles")
        .select(GOOGLE_NEWS_SELECT)
        .not("published_at", "is", null)
        .gte("published_at", cutoffIso)
        .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(bounded);
      return {
        data: (res.data ?? null) as GoogleNewsArticleRow[] | null,
        error: res.error,
      };
    },
    {
      label: "google_news_pool",
      timeoutMs: POOL_QUERY_TIMEOUT_MS,
      retries: 0,
    }
  );

  if (!result.ok) {
    errorLiveFeed("google_news_pool_query_error", {
      message: result.error.message,
      code: result.error.postgrest?.code,
      cutoffIso,
      durationMs: Date.now() - startedAt,
    });
    logNewsroom("generated", "fetch_google_news_pool_failed", {
      error: result.error.message,
      cutoffIso,
    });
    return [];
  }

  const rows = (result.data ?? []).filter(
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

  return rows;
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
  const pool = await fetchGeneratedArticlePool(limit, { select: "slug" });
  return pool.map((r) => r.slug).filter(Boolean);
}

export type SitemapGeneratedArticle = {
  slug: string;
  published_at: string | null;
  created_at: string;
  editorial_status?: string | null;
  workflow_status?: string | null;
};

/** Sitemap-oriented pool: slug + lastmod fields only, hard-capped. */
export async function fetchSitemapGeneratedArticles(
  limit: number = GENERATED_POOL_HARD_CAPS.sitemap
): Promise<SitemapGeneratedArticle[]> {
  const pool = await fetchGeneratedArticlePool(limit, { select: "sitemap" });
  return pool.map((row) => ({
    slug: row.slug,
    published_at: row.published_at,
    created_at: row.created_at,
    editorial_status: row.editorial_status,
    workflow_status: (row as { workflow_status?: string | null }).workflow_status,
  }));
}
