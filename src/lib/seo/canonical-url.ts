/** Canonical production origin — all SEO signals must use this host. */
export const CANONICAL_SITE_URL = "https://www.jandarpan.news";

const NON_CANONICAL_HOST_MARKERS = [
  "vercel.app",
  "localhost",
  "127.0.0.1",
] as const;

function trimEnvUrl(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^\uFEFF/, "").trim().replace(/^['"]|['"]$/g, "");
}

function isNonCanonicalHost(url: string): boolean {
  return NON_CANONICAL_HOST_MARKERS.some((marker) => url.includes(marker));
}

function parseAbsoluteHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function resolveCanonicalSiteUrl(): string {
  const candidates = [
    trimEnvUrl(process.env.NEXT_PUBLIC_SITE_URL),
    trimEnvUrl(process.env.NEXT_PUBLIC_APP_URL),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\/$/, "");
    if (!normalized || isNonCanonicalHost(normalized)) {
      continue;
    }

    const parsed = parseAbsoluteHttpUrl(normalized);
    if (parsed) {
      return normalized;
    }
  }

  return CANONICAL_SITE_URL;
}

export function resolveCanonicalSiteHostname(): string {
  return new URL(resolveCanonicalSiteUrl()).hostname;
}
