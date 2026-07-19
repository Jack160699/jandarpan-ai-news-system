/**
 * Local/mock AI enrichment gate — shared by chat + health (no circular imports).
 *
 * Production: disabled unless explicitly AI_LOCAL_ENRICH_ENABLED=true
 * Non-production: enabled unless explicitly AI_LOCAL_ENRICH_ENABLED=false
 */

export function isLocalEnrichEnabled(): boolean {
  if (process.env.AI_LOCAL_ENRICH_ENABLED === "true") return true;
  if (process.env.AI_LOCAL_ENRICH_ENABLED === "false") return false;
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
  return process.env.AI_LOCAL_ENRICH_ENABLED !== "false";
}
