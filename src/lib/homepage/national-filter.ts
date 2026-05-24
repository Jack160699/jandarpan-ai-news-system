/**
 * National vs international segmentation for homepage wire — no API changes.
 */

import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

export const NATIONAL_SEGMENTS = ["national", "international"] as const;
export type NationalSegment = (typeof NATIONAL_SEGMENTS)[number];

const INTERNATIONAL_RE =
  /\b(world|global|international|foreign|abroad|diplomat|united nations|nato|g7|g20)\b|विश्व|अंतर्राष्ट्र|विदेश/i;

const NATIONAL_RE =
  /\b(india|indian|national|delhi|parliament|lok sabha|rajya sabha|modi|centre|center)\b|भारत|देश|राष्ट्रीय|संसद/i;

const NATIONAL_SECTIONS = new Set<HomeArticle["section"]>([
  "india",
  "chhattisgarh",
  "raipur",
  "business",
  "sports",
  "education",
]);

function articleSearchBlob(article: HomeArticle): string {
  return [
    article.headline,
    article.summary,
    article.categoryLabel,
    article.section,
    article.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export function resolveNationalSegment(
  article: HomeArticle
): NationalSegment | null {
  if (article.section === "world") return "international";
  if (NATIONAL_SECTIONS.has(article.section)) return "national";

  const text = articleSearchBlob(article);
  if (INTERNATIONAL_RE.test(text)) return "international";
  if (NATIONAL_RE.test(text)) return "national";
  return null;
}

/** Stable assignment when metadata is ambiguous */
export function assignNationalSegment(article: HomeArticle): NationalSegment {
  const resolved = resolveNationalSegment(article);
  if (resolved) return resolved;
  let hash = 0;
  for (let i = 0; i < article.id.length; i++) {
    hash = (hash + article.id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? "national" : "international";
}

export function buildNationalArticlePool(
  feed: GeneratedHomepageFeed,
  wireItems: HomeArticle[]
): HomeArticle[] {
  const seen = new Set<string>();
  const out: HomeArticle[] = [];

  const push = (article: HomeArticle) => {
    if (seen.has(article.id)) return;
    seen.add(article.id);
    out.push(article);
  };

  for (const article of wireItems) push(article);
  for (const article of feed.trending.slice(0, 12)) push(article);
  for (const article of feed.regionalHighlights.slice(0, 8)) push(article);

  return out;
}

export function filterArticlesByNationalSegment(
  articles: HomeArticle[],
  segment: NationalSegment
): HomeArticle[] {
  return articles.filter(
    (article) => assignNationalSegment(article) === segment
  );
}

export function countArticlesByNationalSegment(
  articles: HomeArticle[]
): Record<NationalSegment, number> {
  const counts: Record<NationalSegment, number> = {
    national: 0,
    international: 0,
  };
  for (const article of articles) {
    counts[assignNationalSegment(article)] += 1;
  }
  return counts;
}

export function defaultNationalSegment(
  counts: Record<NationalSegment, number>
): NationalSegment {
  return counts.international > counts.national ? "international" : "national";
}
