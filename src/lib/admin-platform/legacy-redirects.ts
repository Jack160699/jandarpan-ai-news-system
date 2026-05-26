/**
 * Legacy /dashboard → unified /admin path mapping.
 * Used by middleware and next.config redirects to preserve bookmarks.
 */

const EXACT_MAP: Record<string, string> = {
  "/dashboard": "/admin/editorial",
  "/dashboard/login": "/admin/login",
  "/dashboard/content": "/admin/stories",
  "/dashboard/publish": "/admin/stories",
  "/dashboard/editorial": "/admin/editorial",
  "/dashboard/providers": "/admin/sources",
  "/dashboard/analytics": "/admin/analytics",
  "/dashboard/monitoring": "/admin/ingestion",
  "/dashboard/team": "/admin/team",
  "/dashboard/billing": "/admin/billing",
};

/** Map a legacy dashboard pathname to its admin successor. */
export function mapLegacyDashboardPath(pathname: string): string {
  const base = pathname.split("?")[0];
  if (EXACT_MAP[base]) return EXACT_MAP[base];
  if (base.startsWith("/dashboard/")) return "/admin/editorial";
  return pathname;
}

/** Rewrite `next` query targets that still point at /dashboard. */
export function translateLegacyNextParam(next: string): string {
  const qIndex = next.indexOf("?");
  const pathOnly = qIndex >= 0 ? next.slice(0, qIndex) : next;
  const query = qIndex >= 0 ? next.slice(qIndex) : "";

  if (!pathOnly.startsWith("/dashboard")) return next;
  return mapLegacyDashboardPath(pathOnly) + query;
}

/** Build redirect URL preserving search params (with optional `next` rewrite). */
export function buildLegacyDashboardRedirectUrl(
  requestUrl: string,
  pathname: string
): URL {
  const targetPath = mapLegacyDashboardPath(pathname);
  const url = new URL(targetPath, requestUrl);

  const source = new URL(requestUrl);
  source.searchParams.forEach((value, key) => {
    if (key === "next") {
      url.searchParams.set("next", translateLegacyNextParam(value));
    } else {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

/** Permanent redirects for next.config (source → destination). */
export const LEGACY_DASHBOARD_REDIRECTS: Array<{
  source: string;
  destination: string;
}> = Object.entries(EXACT_MAP).map(([source, destination]) => ({
  source,
  destination,
}));
