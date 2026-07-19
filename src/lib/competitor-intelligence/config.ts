/**
 * Competitor Intelligence — feature flag + crawl tunables
 */

export function isCompetitorTrackerEnabled(): boolean {
  return process.env.SEO_COMPETITOR_TRACKER === "true";
}

/** Polite delay between competitor source fetches (ms). */
export const COMPETITOR_SOURCE_DELAY_MS = Number(
  process.env.COMPETITOR_SOURCE_DELAY_MS ?? 1_000
);

/** Max RSS items processed per source per crawl. */
export const COMPETITOR_MAX_ITEMS_PER_SOURCE = Number(
  process.env.COMPETITOR_MAX_ITEMS_PER_SOURCE ?? 20
);

/** Max article pages enriched with HTML metadata per source per crawl. */
export const COMPETITOR_MAX_PAGE_ENRICHMENTS = Number(
  process.env.COMPETITOR_MAX_PAGE_ENRICHMENTS ?? 2
);

/** HTTP timeout for feed/page fetches (ms). */
export const COMPETITOR_FETCH_TIMEOUT_MS = Number(
  process.env.COMPETITOR_FETCH_TIMEOUT_MS ?? 8_000
);

/** Hard ceiling for a single competitor domain crawl (ms). */
export const COMPETITOR_DOMAIN_TIMEOUT_MS = Number(
  process.env.COMPETITOR_DOMAIN_TIMEOUT_MS ?? 25_000
);

/** Hard ceiling for a single HTML page enrichment (ms). */
export const COMPETITOR_PAGE_TIMEOUT_MS = Number(
  process.env.COMPETITOR_PAGE_TIMEOUT_MS ?? 6_000
);

/**
 * Wall-clock budget for one cron invocation (leave headroom under Vercel 120s).
 */
export const COMPETITOR_RUN_BUDGET_MS = Number(
  process.env.COMPETITOR_RUN_BUDGET_MS ?? 95_000
);

/** Max competitor sources processed per cron tick. */
export const COMPETITOR_BATCH_SIZE = Number(
  process.env.COMPETITOR_BATCH_SIZE ?? 3
);

export const COMPETITOR_PROGRESS_CACHE_KEY = "ops:competitor:progress:v1";
export const COMPETITOR_PROGRESS_TTL_SEC = 86_400;

export const COMPETITOR_USER_AGENT =
  "Mozilla/5.0 (compatible; Jandarpan-CompetitorIntel/1.0; +https://www.jandarpan.news)";
