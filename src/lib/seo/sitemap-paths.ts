import { LEGAL_SITEMAP_PATHS } from "@/lib/legal/foundation-policies";
import { CATEGORY_SEO } from "@/lib/seo/categories";

/** Public routes that must appear in /sitemap.xml */
export const REQUIRED_SITEMAP_PATHS: string[] = [
  "/",
  "/search",
  "/archive",
  "/listen",
  "/shorts",
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
