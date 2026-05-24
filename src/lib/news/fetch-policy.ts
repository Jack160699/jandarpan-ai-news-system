/**
 * Canonical fetch options for live news — never cache wire or DB reads on Vercel.
 */

export const LIVE_FETCH_INIT: RequestInit = {
  cache: "no-store",
  next: { revalidate: 0 },
};

/** Merge live policy with caller headers / signal (preserves Headers instances) */
export function withLiveFetchInit(
  init: RequestInit = {}
): RequestInit & { next: { revalidate: number } } {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return {
    ...init,
    ...LIVE_FETCH_INIT,
    headers,
    next: { revalidate: 0 },
  };
}
