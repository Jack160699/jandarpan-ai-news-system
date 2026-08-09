/**
 * Local/mock AI enrichment gate — shared by chat + health (no circular imports).
 *
 * Production: enabled in free-capacity mode so raw RSS enrichment never
 * consumes the scarce cloud quota reserved for publishable editorials.
 * Non-production: enabled unless explicitly AI_LOCAL_ENRICH_ENABLED=false
 */

export function isFreeCapacityMode(): boolean {
  return process.env.AI_FREE_CAPACITY_MODE !== "false";
}

export function isLocalEnrichEnabled(): boolean {
  if (process.env.AI_LOCAL_ENRICH_ENABLED === "true") return true;
  if (process.env.AI_LOCAL_ENRICH_ENABLED === "false") return false;
  if (isFreeCapacityMode()) return true;
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL_ENV !== "production"
  );
}

/** True when production would treat local enrich as a misconfiguration. */
export function isLocalEnrichMisconfiguredForProduction(): boolean {
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  if (!isProd) return false;
  return (
    !isFreeCapacityMode() &&
    process.env.AI_LOCAL_ENRICH_ENABLED !== "false"
  );
}
