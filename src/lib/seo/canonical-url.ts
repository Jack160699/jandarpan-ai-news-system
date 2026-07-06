/** Canonical production origin — all SEO signals must use this host. */
export const CANONICAL_SITE_URL = "https://www.jandarpan.news";

export function resolveCanonicalSiteUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  ).replace(/\/$/, "");

  if (
    raw &&
    !raw.includes("vercel.app") &&
    !raw.includes("localhost") &&
    !raw.includes("127.0.0.1")
  ) {
    return raw;
  }

  return CANONICAL_SITE_URL;
}
