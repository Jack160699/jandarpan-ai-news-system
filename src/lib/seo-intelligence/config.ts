/**
 * SEO Intelligence Engine — feature flag + tunables
 */

export function isSeoIntelligenceEnabled(): boolean {
  return process.env.SEO_INTELLIGENCE_ENGINE === "true";
}

/** Analysis window — compare articles from the last N days. */
export const SEO_ANALYSIS_WINDOW_DAYS = Number(
  process.env.SEO_ANALYSIS_WINDOW_DAYS ?? 7
);

/** Max competitor articles loaded per analysis run. */
export const SEO_MAX_COMPETITOR_ARTICLES = Number(
  process.env.SEO_MAX_COMPETITOR_ARTICLES ?? 500
);

/** Max Jandarpan articles loaded per analysis run. */
export const SEO_MAX_JANDARPAN_ARTICLES = Number(
  process.env.SEO_MAX_JANDARPAN_ARTICLES ?? 500
);

/** Jaccard threshold below which a competitor story is a missing story. */
export const GAP_MISSING_STORY_THRESHOLD = 0.25;

/** Jaccard threshold above which stories are duplicate topics. */
export const GAP_DUPLICATE_TOPIC_THRESHOLD = 0.6;
