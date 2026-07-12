/**
 * GSC Intelligence — feature flag + tunables
 */

import { SITE_URL } from "@/lib/seo/constants";

export function isGscEngineEnabled(): boolean {
  return process.env.SEO_GSC_ENGINE === "true";
}

/** GSC property URL — URL-prefix or domain property */
export function getGscSiteUrl(): string {
  const configured = process.env.GSC_SITE_URL?.trim();
  if (configured) return configured;
  const base = SITE_URL.endsWith("/") ? SITE_URL : `${SITE_URL}/`;
  return base;
}

export const GSC_FETCH_TIMEOUT_MS = Number(
  process.env.GSC_FETCH_TIMEOUT_MS ?? 20_000
);

export const GSC_QUERY_ROW_LIMIT = Number(
  process.env.GSC_QUERY_ROW_LIMIT ?? 500
);

export const GSC_PAGE_ROW_LIMIT = Number(
  process.env.GSC_PAGE_ROW_LIMIT ?? 500
);

export const GSC_LOOKBACK_DAYS = Number(
  process.env.GSC_LOOKBACK_DAYS ?? 90
);

export const GSC_COMPARISON_DAYS = Number(
  process.env.GSC_COMPARISON_DAYS ?? 28
);

export const GSC_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

export function hasGscCredentialsConfigured(): boolean {
  if (process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) return true;
  return Boolean(
    process.env.GSC_REFRESH_TOKEN &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
  );
}
