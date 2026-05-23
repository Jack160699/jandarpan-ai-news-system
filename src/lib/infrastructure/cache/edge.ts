/**
 * Edge / CDN cache headers for API routes
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";

export function edgeCacheHeaders(options?: {
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
}): HeadersInit {
  const sMaxAge = options?.sMaxAge ?? INFRA_CONFIG.apiEdgeCacheSeconds;
  const swr = options?.staleWhileRevalidate ?? sMaxAge * 2;
  const visibility = options?.private ? "private" : "public";

  return {
    "Cache-Control": `${visibility}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  };
}

export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, must-revalidate",
  };
}
