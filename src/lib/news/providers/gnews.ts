/**
 * GNews provider — India headlines + gap-first district search
 * https://gnews.io/api/v4/top-headlines
 * https://gnews.io/api/v4/search
 */

import { fetchJson } from "@/lib/news/http";
import { normalizeImageUrl, pickBestImageCandidate } from "@/lib/news/images/extract";
import { dedupeArticles, isValidHttpUrl, parsePublishedAt } from "@/lib/news/normalize";
import {
  normalizeNewsEncoding,
  safeParsePublishedAt,
} from "@/lib/news/sanitize-article";
import type { NormalizedArticle, ProviderFetchResult } from "@/lib/news/types";
import type { CoveragePlanItem } from "@/lib/autonomous/types";
import type { GnewsDistrictQuery } from "@/lib/autonomous/gnews-quota-planner";

const GNEWS_HEADLINES = "https://gnews.io/api/v4/top-headlines";
const GNEWS_SEARCH = "https://gnews.io/api/v4/search";
const GNEWS_CATEGORY_BATCH_SIZE = 1;
const GNEWS_CATEGORY_DELAY_MS = 600;
const GNEWS_SHADOW_SAMPLE_QUERIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GNEWS_CATEGORIES = [
  "business",
  "technology",
  "sports",
  "entertainment",
  "health",
  "nation",
] as const;

export type GNewsCategory = (typeof GNEWS_CATEGORIES)[number];

type GNewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  source?: { name?: string; url?: string };
};

type GNewsResponse = {
  totalArticles?: number;
  articles?: GNewsArticle[];
  errors?: string[];
};

function getApiKey(): string | null {
  const key = process.env.GNEWS_API_KEY?.trim();
  return key || null;
}

function mapCategory(gnewsCategory: GNewsCategory | "search"): string {
  if (gnewsCategory === "search") return "local";
  return gnewsCategory === "nation" ? "politics" : gnewsCategory;
}

function mapArticle(
  raw: GNewsArticle,
  gnewsCategory: GNewsCategory | "search",
  regionHint?: "india" | "chhattisgarh" | "global" | null
): NormalizedArticle | null {
  const title = normalizeNewsEncoding(raw.title);
  const articleUrl = normalizeNewsEncoding(raw.url);

  if (!title || !articleUrl || !isValidHttpUrl(articleUrl)) return null;

  const imageRaw = raw.image?.trim();
  const imagePick = imageRaw
    ? pickBestImageCandidate([{ url: imageRaw, source: "provider" }])
    : null;

  return {
    title,
    description: raw.description?.trim() ?? null,
    content: raw.content?.trim() ?? null,
    image_url: imagePick ? normalizeImageUrl(imagePick.url, articleUrl) : null,
    source: raw.source?.name?.trim() ?? null,
    author: null,
    category: mapCategory(gnewsCategory),
    published_at: safeParsePublishedAt(parsePublishedAt(raw.publishedAt)),
    article_url: articleUrl,
    provider: "gnews",
    language: "en",
    region: regionHint ?? "india",
  };
}

export function isGNewsGapFirstEnabled(
  env: { readonly [key: string]: string | undefined } = process.env
): boolean {
  const kill =
    (env.AUTONOMOUS_KILL_SWITCH ?? "").trim() === "1" ||
    (env.AUTONOMOUS_KILL_SWITCH ?? "").trim().toLowerCase() === "true";
  if (kill) return false;

  const raw = (env.GNEWS_GAP_FIRST ?? "").trim().toLowerCase();
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  // Default true when autonomous is not kill-switched
  return true;
}

export async function fetchGNewsCategory(
  category: GNewsCategory
): Promise<{ articles: NormalizedArticle[]; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { articles: [], error: "GNEWS_API_KEY not configured" };
  }

  const params = new URLSearchParams({
    category,
    country: "in",
    lang: "en",
    max: "15",
    apikey: apiKey,
  });

  try {
    const { data } = await fetchJson<GNewsResponse>(
      `${GNEWS_HEADLINES}?${params.toString()}`,
      { timeoutMs: 18_000, retries: 1, provider: "gnews" }
    );

    if (data.errors?.length) {
      const errMsg = data.errors.join("; ");
      if (/rate|quota|limit/i.test(errMsg)) {
        return { articles: [], error: `GNews quota/rate limit: ${errMsg}` };
      }
    }

    const articles =
      data.articles
        ?.map((a) => mapArticle(a, category))
        .filter((a): a is NormalizedArticle => a !== null) ?? [];

    console.log(`[gnews] ${category}: ${articles.length} valid articles`);
    return { articles };
  } catch (err) {
    const message = err instanceof Error ? err.message : "GNews request failed";
    console.error(`[gnews] ${category}:`, message);
    return { articles: [], error: message };
  }
}

export async function fetchGNewsSearch(
  query: string,
  opts?: {
    lang?: string;
    country?: string;
    max?: number;
    regionHint?: "india" | "chhattisgarh" | "global" | null;
  }
): Promise<{ articles: NormalizedArticle[]; error?: string; query: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { articles: [], error: "GNEWS_API_KEY not configured", query };
  }

  const q = query.trim();
  if (!q) {
    return { articles: [], error: "empty_query", query };
  }

  const params = new URLSearchParams({
    q,
    lang: opts?.lang ?? "en",
    country: opts?.country ?? "in",
    max: String(Math.min(25, Math.max(1, opts?.max ?? 10))),
    apikey: apiKey,
  });

  try {
    const { data } = await fetchJson<GNewsResponse>(
      `${GNEWS_SEARCH}?${params.toString()}`,
      { timeoutMs: 18_000, retries: 1, provider: "gnews" }
    );

    if (data.errors?.length) {
      const errMsg = data.errors.join("; ");
      if (/rate|quota|limit/i.test(errMsg)) {
        return {
          articles: [],
          error: `GNews quota/rate limit: ${errMsg}`,
          query: q,
        };
      }
      return { articles: [], error: errMsg, query: q };
    }

    const articles =
      data.articles
        ?.map((a) => mapArticle(a, "search", opts?.regionHint ?? "chhattisgarh"))
        .filter((a): a is NormalizedArticle => a !== null) ?? [];

    console.log(`[gnews] search "${q}": ${articles.length} valid articles`);
    return { articles, query: q };
  } catch (err) {
    const message = err instanceof Error ? err.message : "GNews search failed";
    console.error(`[gnews] search "${q}":`, message);
    return { articles: [], error: message, query: q };
  }
}

export type FetchGNewsGapFirstOpts = {
  underCovered?: CoveragePlanItem[];
  requestsLimit?: number;
  requestsUsed?: number;
  day?: string;
  /** Override planned queries (tests) */
  queries?: GnewsDistrictQuery[];
  /** Max search queries to execute */
  maxQueries?: number;
  env?: { readonly [key: string]: string | undefined };
};

/**
 * Load under-covered districts for the IST day.
 * Prefer `district_coverage_daily` deficit rows; fallback to published
 * `generated_articles` primary_district counts vs CG_DISTRICTS dailyTarget.
 */
export async function loadUnderCoveredForIstDay(
  day?: string
): Promise<CoveragePlanItem[]> {
  const { formatIstDay, getIstDayBounds } = await import(
    "@/lib/autonomous/ist-day"
  );
  const {
    buildCoveragePlan,
    getUnderCoveredDistricts,
  } = await import("@/lib/autonomous/coverage-controller");
  const { CG_DISTRICTS } = await import("@/lib/regional/districts");

  const istDay = day ?? formatIstDay();
  const bounds = getIstDayBounds(istDay);

  try {
    const { createAdminServerClient, isSupabaseConfigured } = await import(
      "@/lib/supabase"
    );
    if (!isSupabaseConfigured()) return [];

    const supabase = createAdminServerClient();

    const { data: coverageRows, error: coverageErr } = await supabase
      .from("district_coverage_daily" as never)
      .select("district_slug, target, published, deficit, tier")
      .eq("day", istDay)
      .gt("deficit", 0)
      .order("deficit", { ascending: false })
      .limit(80);

    if (!coverageErr && (coverageRows?.length ?? 0) > 0) {
      return (coverageRows ?? []).map((row: {
        district_slug?: string | null;
        target?: number | null;
        published?: number | null;
        deficit?: number | null;
        tier?: string | null;
      }) => {
        const slug = String(row.district_slug ?? "").toLowerCase();
        const district = CG_DISTRICTS.find((d) => d.slug === slug);
        const deficit = Number(row.deficit ?? 0);
        const target = Number(row.target ?? district?.dailyTarget ?? 0);
        const published = Number(row.published ?? 0);
        const tier =
          (row.tier as CoveragePlanItem["tier"]) ??
          district?.tierLabel ??
          "low";
        return {
          districtSlug: slug,
          tier,
          target,
          published,
          deficit,
          priorityScore: deficit * 10 + target,
        };
      });
    }

    // Fallback: count today's published primary_district vs dailyTarget
    const { data: publishedRows } = await supabase
      .from("generated_articles")
      .select("geo_metadata")
      .eq("workflow_status", "published")
      .gte("published_at", bounds.startIso)
      .lt("published_at", bounds.endIso)
      .limit(2000);

    const publishedByDistrict: Record<string, number> = {};
    for (const row of publishedRows ?? []) {
      const geo = (row as { geo_metadata?: Record<string, unknown> | null })
        .geo_metadata;
      const primary =
        typeof geo?.primary_district === "string"
          ? geo.primary_district.trim().toLowerCase()
          : typeof geo?.district === "string"
            ? geo.district.trim().toLowerCase()
            : null;
      if (!primary) continue;
      publishedByDistrict[primary] = (publishedByDistrict[primary] ?? 0) + 1;
    }

    const plan = buildCoveragePlan({
      day: istDay,
      publishedByDistrict,
    });
    return getUnderCoveredDistricts(plan);
  } catch (err) {
    console.warn(
      "[gnews] loadUnderCoveredForIstDay failed:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

/**
 * Gap-first GNews fetch using planGnewsQuota when enabled.
 * Preserves markProviderQuotaExhausted on hard quota errors.
 */
export async function fetchGNewsGapFirst(
  opts: FetchGNewsGapFirstOpts = {}
): Promise<
  ProviderFetchResult & {
    mode: "gap_first" | "gap_first_shadow_sample";
    queriesRun: string[];
  }
> {
  const startedAt = Date.now();
  const env = opts.env ?? process.env;
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      provider: "gnews",
      label: "GNews (gap-first)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: ["GNEWS_API_KEY not configured"],
      durationMs: Date.now() - startedAt,
      mode: "gap_first",
      queriesRun: [],
    };
  }

  const {
    buildSourceKey,
    isSourceCurrentlyBlocked,
    loadIngestionSourceState,
    markProviderQuotaExhausted,
    nextUtcMidnightIso,
  } = await import("@/lib/news/ingestion/source-state");

  const familyKey = buildSourceKey("gnews", "api");
  const state = await loadIngestionSourceState(familyKey);
  const blocked = isSourceCurrentlyBlocked(state);
  if (blocked.blocked) {
    return {
      provider: "gnews",
      label: "GNews (gap-first)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: [`gnews_skipped:${blocked.reason}`],
      durationMs: Date.now() - startedAt,
      mode: "gap_first",
      queriesRun: [],
    };
  }

  const { planGnewsQuota } = await import(
    "@/lib/autonomous/gnews-quota-planner"
  );
  const { getAutonomousRolloutStage } = await import(
    "@/lib/autonomous/rollout-state"
  );
  const { formatIstDay } = await import("@/lib/autonomous/ist-day");

  const stage = getAutonomousRolloutStage(env);
  const day = opts.day ?? formatIstDay();

  let underCovered = opts.underCovered ?? [];
  // When caller did not supply underCovered, load for IST day before planning.
  // Explicit [] from a caller that already attempted load is respected (no reload).
  if (opts.underCovered === undefined && !opts.queries) {
    underCovered = await loadUnderCoveredForIstDay(day);
  }

  const plan = planGnewsQuota({
    day,
    requestsLimit:
      opts.requestsLimit ?? (Number(env.GNEWS_DAILY_LIMIT ?? "100") || 100),
    requestsUsed: opts.requestsUsed ?? 0,
    underCovered,
  });

  let queries = opts.queries ?? plan.queries;
  let mode: "gap_first" | "gap_first_shadow_sample" = "gap_first";

  if (stage === "shadow") {
    // Shadow: execute only first 2 planned queries as comparison sample
    queries = queries.slice(0, GNEWS_SHADOW_SAMPLE_QUERIES);
    mode = "gap_first_shadow_sample";
  } else if (opts.maxQueries != null) {
    queries = queries.slice(0, opts.maxQueries);
  }

  const articles: NormalizedArticle[] = [];
  const errors: string[] = [];
  const queriesRun: string[] = [];
  let fetched = 0;
  let quotaExhausted = false;

  for (let i = 0; i < queries.length; i++) {
    if (quotaExhausted) break;
    const q = queries[i];
    const result = await fetchGNewsSearch(q.query, {
      max: 10,
      regionHint: "chhattisgarh",
    });
    queriesRun.push(q.query);
    fetched += result.articles.length;
    articles.push(...result.articles);
    if (result.error) {
      errors.push(`search:${q.districtSlug}:${result.error}`);
      if (isGNewsQuotaError(result.error)) {
        quotaExhausted = true;
        await markProviderQuotaExhausted({
          sourceKey: familyKey,
          providerFamily: "gnews",
          untilIso: nextUtcMidnightIso(),
          errorCategory: "quota_exhausted",
        });
      }
    }
    if (i + 1 < queries.length) await sleep(GNEWS_CATEGORY_DELAY_MS);
  }

  const { unique, skipped } = dedupeArticles(articles, { fuzzy: true });
  if (skipped > 0) {
    console.log(`[gnews] gap-first deduped ${skipped}`);
  }

  return {
    provider: "gnews",
    label: "GNews (gap-first)",
    articles: unique,
    fetched,
    valid: unique.length,
    errors,
    durationMs: Date.now() - startedAt,
    mode,
    queriesRun,
  };
}

async function fetchGNewsCategoryLoop(): Promise<ProviderFetchResult> {
  const startedAt = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      provider: "gnews",
      label: "GNews (India)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: ["GNEWS_API_KEY not configured"],
      durationMs: Date.now() - startedAt,
    };
  }

  const {
    buildSourceKey,
    isSourceCurrentlyBlocked,
    loadIngestionSourceState,
    markProviderQuotaExhausted,
    nextUtcMidnightIso,
  } = await import("@/lib/news/ingestion/source-state");

  const familyKey = buildSourceKey("gnews", "api");
  const state = await loadIngestionSourceState(familyKey);
  const blocked = isSourceCurrentlyBlocked(state);
  if (blocked.blocked) {
    return {
      provider: "gnews",
      label: "GNews (India)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: [`gnews_skipped:${blocked.reason}`],
      durationMs: Date.now() - startedAt,
    };
  }

  const results: Array<{
    category: GNewsCategory;
    articles: NormalizedArticle[];
    error?: string;
  }> = [];

  let quotaExhausted = false;
  let requestsAfterQuota = 0;

  for (let i = 0; i < GNEWS_CATEGORIES.length; i += GNEWS_CATEGORY_BATCH_SIZE) {
    if (quotaExhausted) {
      requestsAfterQuota += GNEWS_CATEGORIES.length - i;
      break;
    }

    const chunk = GNEWS_CATEGORIES.slice(i, GNEWS_CATEGORY_BATCH_SIZE + i);
    const settled = await Promise.allSettled(
      chunk.map(async (category) => {
        const result = await fetchGNewsCategory(category);
        return { category, ...result };
      })
    );

    for (let j = 0; j < settled.length; j++) {
      const category = chunk[j];
      const entry = settled[j];
      if (entry.status === "fulfilled") {
        results.push(entry.value);
        const err = entry.value.error ?? "";
        if (isGNewsQuotaError(err)) {
          quotaExhausted = true;
        }
      } else {
        const msg =
          entry.reason instanceof Error
            ? entry.reason.message
            : "category failed";
        results.push({ category, articles: [], error: msg });
        if (isGNewsQuotaError(msg)) {
          quotaExhausted = true;
        }
      }
    }

    if (quotaExhausted) {
      await markProviderQuotaExhausted({
        sourceKey: familyKey,
        providerFamily: "gnews",
        untilIso: nextUtcMidnightIso(),
        errorCategory: "quota_exhausted",
      });
      break;
    }

    if (i + GNEWS_CATEGORY_BATCH_SIZE < GNEWS_CATEGORIES.length) {
      await sleep(GNEWS_CATEGORY_DELAY_MS);
    }
  }

  const articles: NormalizedArticle[] = [];
  const errors: string[] = [];
  let fetched = 0;

  for (const r of results) {
    fetched += r.articles.length;
    if (r.error) errors.push(`${r.category}: ${r.error}`);
    articles.push(...r.articles);
  }

  if (quotaExhausted) {
    errors.push(
      `gnews_quota_abort: remaining_categories_skipped requestsAfterQuotaEstimate=${requestsAfterQuota}`
    );
  }

  const { unique, skipped } = dedupeArticles(articles, { fuzzy: true });
  if (skipped > 0) {
    console.log(`[gnews] deduped ${skipped} duplicate articles across categories`);
  }

  return {
    provider: "gnews",
    label: "GNews (India)",
    articles: unique,
    fetched,
    valid: unique.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Stage-aware entry:
 * - shadow + gap-first: sample 2 planned queries + optional one category batch
 * - stage_1+: gap-first fully; skip old six-category loop
 * - gap-first disabled: legacy six-category loop
 */
export async function fetchGNewsAll(): Promise<ProviderFetchResult> {
  const startedAt = Date.now();
  const env = process.env;

  if (!isGNewsGapFirstEnabled(env)) {
    return fetchGNewsCategoryLoop();
  }

  const { getAutonomousRolloutStage } = await import(
    "@/lib/autonomous/rollout-state"
  );
  const stage = getAutonomousRolloutStage(env);

  // Load under-covered districts once; pass into gap-first (shadow + stage_1+).
  const underCovered = await loadUnderCoveredForIstDay();

  // stage_1+: gap-first only (skip six-category loop)
  if (stage !== "shadow") {
    const gap = await fetchGNewsGapFirst({ env, underCovered });
    // Safety: statewide fallback only when still no queries after loading underCovered.
    if (gap.queriesRun.length === 0 && gap.articles.length === 0) {
      const statewide = await fetchGNewsSearch("Chhattisgarh news", {
        max: 15,
        regionHint: "chhattisgarh",
      });
      const { unique } = dedupeArticles(statewide.articles, { fuzzy: true });
      return {
        provider: "gnews",
        label: "GNews (gap-first statewide fallback)",
        articles: unique,
        fetched: statewide.articles.length,
        valid: unique.length,
        errors: [
          ...gap.errors,
          ...(statewide.error ? [statewide.error] : []),
          "gnews_mode:gap_first_statewide_fallback",
        ],
        durationMs: Date.now() - startedAt,
      };
    }
    return {
      provider: gap.provider,
      label: gap.label,
      articles: gap.articles,
      fetched: gap.fetched,
      valid: gap.valid,
      errors: [...gap.errors, `gnews_mode:${gap.mode}`],
      durationMs: Date.now() - startedAt,
    };
  }

  // Shadow: gap-first sample (2 queries) + one category batch for comparison
  const gap = await fetchGNewsGapFirst({ env, underCovered });
  const oneCategory = await fetchGNewsCategory("nation");
  const merged = [...gap.articles, ...oneCategory.articles];
  const { unique, skipped } = dedupeArticles(merged, { fuzzy: true });
  if (skipped > 0) {
    console.log(`[gnews] shadow sample deduped ${skipped}`);
  }

  const errors = [
    ...gap.errors,
    ...(oneCategory.error ? [`nation:${oneCategory.error}`] : []),
    `gnews_mode:${gap.mode}+one_category`,
    `gnews_shadow_queries:${gap.queriesRun.join("|") || "none"}`,
  ];

  if (oneCategory.error && isGNewsQuotaError(oneCategory.error)) {
    const {
      buildSourceKey,
      markProviderQuotaExhausted,
      nextUtcMidnightIso,
    } = await import("@/lib/news/ingestion/source-state");
    await markProviderQuotaExhausted({
      sourceKey: buildSourceKey("gnews", "api"),
      providerFamily: "gnews",
      untilIso: nextUtcMidnightIso(),
      errorCategory: "quota_exhausted",
    });
  }

  return {
    provider: "gnews",
    label: "GNews (shadow gap-first sample)",
    articles: unique,
    fetched: gap.fetched + oneCategory.articles.length,
    valid: unique.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

function isGNewsQuotaError(message: string): boolean {
  return /quota|rate\s*limit|429|unauthorized\s*\(403\)|403|usage\s*limit|plan\s*limit/i.test(
    message
  );
}

export { isGNewsQuotaError };
