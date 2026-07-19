import { LEGAL_SITEMAP_PATHS } from "@/lib/legal/foundation-policies";
import { CATEGORY_SEO } from "@/lib/seo/categories";

/** Public routes that must appear in /sitemap.xml */
export const REQUIRED_SITEMAP_PATHS: string[] = [
  "/",
  "/search",
  "/listen",
  "/shorts",
  "/live",
  "/news/national",
  "/news/international",
  "/about",
  "/contact",
  "/editorial-policy",
  "/corrections",
  "/copyright-content-removal",
  "/privacy",
  "/terms",
  "/feed.xml",
  ...CATEGORY_SEO.map((c) => c.path),
  ...LEGAL_SITEMAP_PATHS.filter(
    (p) => !["/about", "/contact", "/editorial-policy", "/corrections", "/copyright-content-removal", "/privacy", "/terms", "/feed.xml"].includes(p)
  ),
];

/**
 * Normalize sitemap URLs for set membership checks.
 * Strips trailing slashes except for origin-only homepage URLs.
 */
export function normalizeSitemapUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname || "/";
    if (pathname === "/") {
      return parsed.origin;
    }
    const normalizedPath = pathname.replace(/\/$/, "") || "/";
    return `${parsed.origin}${normalizedPath}${parsed.search}${parsed.hash}`;
  } catch {
    if (trimmed === "/") return "/";
    return trimmed.replace(/\/$/, "") || "/";
  }
}

/** Build an absolute sitemap URL for a required public path. */
export function sitemapUrlForPath(siteUrl: string, path: string): string {
  const origin = siteUrl.replace(/\/$/, "");
  if (path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** True when a required path is present in a list of sitemap entry URLs. */
export function isRequiredPathInSitemap(
  siteUrl: string,
  path: string,
  sitemapUrls: string[]
): boolean {
  const target = normalizeSitemapUrl(sitemapUrlForPath(siteUrl, path));
  const normalized = new Set(sitemapUrls.map(normalizeSitemapUrl));
  return normalized.has(target);
}
