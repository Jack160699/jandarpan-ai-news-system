/** Responsive srcset hint for Next/Image — client-safe (no sharp) */

export function buildResponsiveSizes(): string {
  return "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px";
}

/** CDN query hints for external fallback URLs (Unsplash etc.) */
export function optimizeCdnImageUrl(url: string, width = 1200): string {
  if (!url.startsWith("http")) return url;

  try {
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "80");
      return u.toString();
    }

    const u = new URL(url);
    if (!u.searchParams.has("w")) {
      u.searchParams.set("w", String(width));
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function buildOpenGraphImageUrl(
  heroUrl: string,
  ogUrl?: string | null
): string {
  return ogUrl?.trim() || optimizeCdnImageUrl(heroUrl, 1200);
}
