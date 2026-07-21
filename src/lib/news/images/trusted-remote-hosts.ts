/**
 * Trusted remote image hosts for Next.js Image Optimization and proxy checks.
 * Keep this list intentional — never allow arbitrary hostnames (SSRF risk).
 */

export type TrustedRemotePattern = {
  protocol: "https";
  hostname: string;
  pathname?: string;
};

/**
 * Hosts already rewritten by `optimizeCdnUrl` plus Jan Darpan storage/CDN.
 * Wildcards match Next.js `images.remotePatterns` semantics.
 */
export const TRUSTED_REMOTE_PATTERNS: readonly TrustedRemotePattern[] = [
  { protocol: "https", hostname: "**.supabase.co" },
  { protocol: "https", hostname: "**.supabase.in" },
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "**.jandarpan.news" },
  { protocol: "https", hostname: "jandarpan.news" },
  // Provider / wire CDNs commonly present on source-extracted heroes
  { protocol: "https", hostname: "**.ndtvimg.com" },
  { protocol: "https", hostname: "**.ndtv.com" },
  { protocol: "https", hostname: "**.googleusercontent.com" },
  { protocol: "https", hostname: "**.ggpht.com" },
  { protocol: "https", hostname: "**.gstatic.com" },
  { protocol: "https", hostname: "**.gnews.io" },
  { protocol: "https", hostname: "i0.wp.com" },
  { protocol: "https", hostname: "i1.wp.com" },
  { protocol: "https", hostname: "i2.wp.com" },
  { protocol: "https", hostname: "**.wp.com" },
  { protocol: "https", hostname: "**.bhaskar.com" },
  { protocol: "https", hostname: "**.bhaskarassets.com" },
  { protocol: "https", hostname: "**.patrika.com" },
  { protocol: "https", hostname: "**.jagranimages.com" },
  { protocol: "https", hostname: "**.jagran.com" },
  { protocol: "https", hostname: "**.naidunia.com" },
  { protocol: "https", hostname: "**.etvbharat.com" },
  { protocol: "https", hostname: "**.indianexpress.com" },
  { protocol: "https", hostname: "**.thehindu.com" },
  { protocol: "https", hostname: "**.hindustantimes.com" },
  { protocol: "https", hostname: "**.timesofindia.com" },
  { protocol: "https", hostname: "static.toiimg.com" },
  { protocol: "https", hostname: "**.news18.com" },
  { protocol: "https", hostname: "**.indiatimes.com" },
] as const;

function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  const host = hostname.toLowerCase();
  const pat = pattern.toLowerCase();
  if (pat.startsWith("**.")) {
    const suffix = pat.slice(2); // ".example.com"
    return host === suffix.slice(1) || host.endsWith(suffix);
  }
  if (pat.startsWith("*.")) {
    const suffix = pat.slice(1);
    return host === suffix.slice(1) || host.endsWith(suffix);
  }
  return host === pat;
}

export function isTrustedImageHost(hostname: string): boolean {
  if (!hostname) return false;
  return TRUSTED_REMOTE_PATTERNS.some((p) =>
    hostnameMatchesPattern(hostname, p.hostname)
  );
}

export function isTrustedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    return isTrustedImageHost(parsed.hostname);
  } catch {
    return false;
  }
}

/** True when URL is a Supabase signed object URL (token-based, expiry-sensitive). */
export function isSupabaseSignedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return (
      (u.hostname.includes("supabase.co") || u.hostname.includes("supabase.in")) &&
      (path.includes("/storage/v1/object/sign/") ||
        u.searchParams.has("token"))
    );
  } catch {
    return false;
  }
}

/**
 * Best-effort signed URL expiry check (Supabase JWT `exp` in token when present).
 * Returns true when expired; false when not expired or unknown.
 */
export function isExpiredSignedUrl(url: string, nowMs = Date.now()): boolean {
  if (!isSupabaseSignedUrl(url)) return false;
  try {
    const u = new URL(url);
    const token = u.searchParams.get("token");
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const data = JSON.parse(json) as { exp?: number };
    if (typeof data.exp !== "number") return false;
    return data.exp * 1000 <= nowMs;
  } catch {
    return false;
  }
}
