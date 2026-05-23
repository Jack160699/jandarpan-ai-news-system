/**
 * Google News sitemap + syndication helpers
 */

import { SITE_NAME, SITE_URL } from "@/lib/seo/constants";

export type GoogleNewsSitemapEntry = {
  loc: string;
  publicationDate: string;
  title: string;
  language: "hi" | "en";
};

const NEWS_WINDOW_HOURS = 48;

export function isWithinGoogleNewsWindow(iso: string | null): boolean {
  if (!iso) return false;
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  return ageH <= NEWS_WINDOW_HOURS;
}

export function buildGoogleNewsSitemapXml(
  entries: GoogleNewsSitemapEntry[]
): string {
  const items = entries
    .map((e) => {
      const lang = e.language === "hi" ? "hi" : "en";
      return `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${e.publicationDate}</news:publication_date>
      <news:title>${escapeXml(e.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toGoogleNewsEntry(input: {
  slug: string;
  headline: string;
  publishedAt: string | null;
  language?: string | null;
}): GoogleNewsSitemapEntry | null {
  if (!input.publishedAt || !isWithinGoogleNewsWindow(input.publishedAt)) {
    return null;
  }

  const lang = input.language === "en" ? "en" : "hi";
  const pub = new Date(input.publishedAt).toISOString();

  return {
    loc: `${SITE_URL}/story/${encodeURIComponent(input.slug)}`,
    publicationDate: pub,
    title: input.headline.slice(0, 200),
    language: lang,
  };
}
