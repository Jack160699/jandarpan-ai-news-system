/**
 * Competitor Intelligence — feature flag + crawl tunables
 */

export function isCompetitorTrackerEnabled(): boolean {
  return process.env.SEO_COMPETITOR_TRACKER === "true";
}

/** Polite delay between competitor source fetches (ms). */
export const COMPETITOR_SOURCE_DELAY_MS = Number(
  process.env.COMPETITOR_SOURCE_DELAY_MS ?? 2_000
);

/** Max RSS items processed per source per crawl. */
export const COMPETITOR_MAX_ITEMS_PER_SOURCE = Number(
  process.env.COMPETITOR_MAX_ITEMS_PER_SOURCE ?? 30
);

/** Max article pages enriched with HTML metadata per source per crawl. */
export const COMPETITOR_MAX_PAGE_ENRICHMENTS = Number(
  process.env.COMPETITOR_MAX_PAGE_ENRICHMENTS ?? 3
);

/** HTTP timeout for feed/page fetches (ms). */
export const COMPETITOR_FETCH_TIMEOUT_MS = Number(
  process.env.COMPETITOR_FETCH_TIMEOUT_MS ?? 12_000
);

export const COMPETITOR_USER_AGENT =
  "Mozilla/5.0 (compatible; Jandarpan-CompetitorIntel/1.0; +https://www.jandarpan.news)";
