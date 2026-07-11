/**
 * SERP Intelligence — feature flag + tunables
 */

import { SITE_URL } from "@/lib/seo/constants";

export function isSerpTrackerEnabled(): boolean {
  return process.env.SEO_SERP_TRACKER === "true";
}

/** Polite delay between keyword SERP fetches (ms). */
export const SERP_KEYWORD_DELAY_MS = Number(
  process.env.SERP_KEYWORD_DELAY_MS ?? 2_500
);

/** Max keywords processed per tracking run. */
export const SERP_MAX_KEYWORDS_PER_RUN = Number(
  process.env.SERP_MAX_KEYWORDS_PER_RUN ?? 40
);

/** HTTP timeout for SERP API calls (ms). */
export const SERP_FETCH_TIMEOUT_MS = Number(
  process.env.SERP_FETCH_TIMEOUT_MS ?? 15_000
);

/** Google search locale */
export const SERP_DEFAULT_GL = process.env.SERP_DEFAULT_GL ?? "in";
export const SERP_DEFAULT_HL = process.env.SERP_DEFAULT_HL ?? "hi";

/** Jandarpan domain for rank detection */
export function getJandarpanDomain(): string {
  try {
    const host = new URL(SITE_URL).hostname.replace(/^www\./, "");
    return host || "jandarpan.news";
  } catch {
    return "jandarpan.news";
  }
}

export const JANDARPAN_DOMAIN = getJandarpanDomain();

/** Known competitor domain → display name */
export const COMPETITOR_DOMAIN_MAP: Record<string, string> = {
  "bhaskar.com": "Dainik Bhaskar",
  "patrika.com": "Patrika",
  "haribhoomi.com": "Haribhoomi",
  "news18.com": "News18 Hindi",
  "hindi.news18.com": "News18 Hindi",
  "amarujala.com": "Amar Ujala",
  "jagran.com": "Jagran",
  "tv9hindi.com": "TV9 Bharatvarsh",
  "aajtak.in": "Aaj Tak",
  "ndtv.com": "NDTV",
  "livehindustan.com": "Live Hindustan",
  "dainiknavajyoti.com": "Navajyoti",
};

export function hasSerpProviderConfigured(): boolean {
  return Boolean(
    process.env.SERPAPI_KEY ||
      (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX)
  );
}
