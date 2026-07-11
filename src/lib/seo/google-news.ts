/**
 * Google News sitemap + syndication helpers
 *
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */

import { SITE_URL } from "@/lib/seo/constants";

export type GoogleNewsSitemapEntry = {
  loc: string;
  publicationDate: string;
  title: string;
  language: "hi" | "en";
};

/** Publication name registered with Google News (distinct from SITE_NAME SEO label). */
export const GOOGLE_NEWS_PUBLICATION_NAME = "Jandarpan News";

export const GOOGLE_NEWS_WINDOW_HOURS = 48;

/** Google allows at most 1,000 news URLs per sitemap file. */
export const GOOGLE_NEWS_SITEMAP_LIMIT = 1_000;

const URLSET_OPEN = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`;

const URLSET_CLOSE = `</urlset>`;

export function getGoogleNewsCutoffIso(now = new Date()): string {
  return new Date(
    now.getTime() - GOOGLE_NEWS_WINDOW_HOURS * 3_600_000
  ).toISOString();
}

export function isWithinGoogleNewsWindow(
  iso: string | null,
  now = new Date()
): boolean {
  if (!iso) return false;
  const publishedAt = new Date(iso);
  if (Number.isNaN(publishedAt.getTime())) return false;
  return publishedAt.getTime() >= new Date(getGoogleNewsCutoffIso(now)).getTime();
}

export function resolveGoogleNewsLanguage(
  language?: string | null
): GoogleNewsSitemapEntry["language"] {
  return language === "en" ? "en" : "hi";
}

export function buildGoogleNewsSitemapXml(
  entries: GoogleNewsSitemapEntry[]
): string {
  if (entries.length === 0) {
    return buildEmptyGoogleNewsSitemapXml();
  }

  const items = entries.map(renderGoogleNewsUrl).join("\n");

  return `${URLSET_OPEN}
${items}
${URLSET_CLOSE}`;
}

/** Valid empty news sitemap — no <url> children when nothing is Google News eligible. */
export function buildEmptyGoogleNewsSitemapXml(reason?: string): string {
  const note =
    reason ??
    `No articles published within the last ${GOOGLE_NEWS_WINDOW_HOURS} hours in generated_articles.`;
  return `${URLSET_OPEN}
  <!-- ${escapeXmlComment(note)} -->
${URLSET_CLOSE}`;
}

function renderGoogleNewsUrl(e: GoogleNewsSitemapEntry): string {
  const lang = resolveGoogleNewsLanguage(e.language);
  return `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(GOOGLE_NEWS_PUBLICATION_NAME)}</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(e.publicationDate)}</news:publication_date>
      <news:title>${escapeXml(e.title)}</news:title>
    </news:news>
  </url>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlComment(s: string): string {
  return s.replace(/--/g, "—");
}

export function toGoogleNewsEntry(
  input: {
    slug: string;
    headline: string;
    publishedAt: string | null;
    language?: string | null;
  },
  now = new Date()
): GoogleNewsSitemapEntry | null {
  const slug = input.slug?.trim();
  const headline = input.headline?.trim();
  if (!slug || !headline) return null;
  if (!input.publishedAt || !isWithinGoogleNewsWindow(input.publishedAt, now)) {
    return null;
  }

  const publishedAt = new Date(input.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) return null;

  return {
    loc: `${SITE_URL}/story/${encodeURIComponent(slug)}`,
    publicationDate: publishedAt.toISOString(),
    title: headline.slice(0, 200),
    language: resolveGoogleNewsLanguage(input.language),
  };
}
