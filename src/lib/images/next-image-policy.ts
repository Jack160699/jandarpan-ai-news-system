/**
 * Decide whether a URL should bypass Next/Image optimization.
 * Wire syndication CDNs are served via native <img> to avoid remotePatterns churn.
 */

function isSameOrigin(url: URL): boolean {
  if (typeof window !== "undefined") {
    return url.origin === window.location.origin;
  }
  return false;
}

/** True when the URL must use native <img> (not next/image). */
export function shouldUseNativeImage(src: string | null | undefined): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/")) return false;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    if (isSameOrigin(url)) return false;
    // Editorial images are fetched directly by the browser. This avoids a
    // single optimizer outage turning every card into a grey placeholder.
    return true;
  } catch {
    return true;
  }
}
