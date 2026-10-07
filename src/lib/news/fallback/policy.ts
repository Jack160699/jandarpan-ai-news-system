/**
 * Static fallback policy.
 *
 * The bundled static article pool (wire-articles.ts) is a frozen set of hard-coded stories. Serving it to readers presents old
 * copy as current news, and it bypasses publication gates, geography policy and the 30-day window. A temporary empty or degraded
 * response is better than an invalid fallback, so the pool is OFF for every deployed environment.
 *
 * It is only used when explicitly enabled (ALLOW_STATIC_FALLBACK_POOL=true) or in local development, where an unconfigured
 * database would otherwise render an empty site.
 */

type EnvLike = Record<string, string | undefined>;

export function isStaticFallbackEnabled(env: EnvLike = process.env): boolean {
  if (env.ALLOW_STATIC_FALLBACK_POOL === "true") return true;
  if (env.ALLOW_STATIC_FALLBACK_POOL === "false") return false;
  return env.NODE_ENV === "development";
}
