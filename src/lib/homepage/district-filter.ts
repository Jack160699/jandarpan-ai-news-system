/**
 * Featured homepage districts — filter pool without changing APIs.
 */

import { CG_DISTRICTS } from "@/lib/regional/districts";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

export const FEATURED_DISTRICT_SLUGS = [
  "bilaspur",
  "raipur",
  "durg",
  "rajnandgaon",
] as const;

export type FeaturedDistrictSlug = (typeof FEATURED_DISTRICT_SLUGS)[number];

const FEATURED_SET = new Set<string>(FEATURED_DISTRICT_SLUGS);

const DISTRICT_BY_SLUG = new Map(
  CG_DISTRICTS.filter((d) => FEATURED_SET.has(d.slug)).map((d) => [d.slug, d])
);

export function getFeaturedDistrict(slug: FeaturedDistrictSlug) {
  return DISTRICT_BY_SLUG.get(slug)!;
}

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

/** Match district from headline/tags; null when no explicit district signal */
export function resolveFeaturedDistrictSlug(
  article: HomeArticle
): FeaturedDistrictSlug | null {
  const text = articleSearchBlob(article);
  for (const slug of FEATURED_DISTRICT_SLUGS) {
    const district = DISTRICT_BY_SLUG.get(slug);
    if (!district) continue;
    if (district.aliases.some((alias) => text.includes(alias.toLowerCase()))) {
      return slug;
    }
  }
  return null;
}

/** Stable fallback so feeds stay populated when district metadata is missing */
export function assignFeaturedDistrictSlug(
  article: HomeArticle
): FeaturedDistrictSlug {
  const resolved = resolveFeaturedDistrictSlug(article);
  if (resolved) return resolved;
  let hash = 0;
  for (let i = 0; i < article.id.length; i++) {
    hash = (hash + article.id.charCodeAt(i)) | 0;
  }
  return FEATURED_DISTRICT_SLUGS[Math.abs(hash) % FEATURED_DISTRICT_SLUGS.length];
}

export function buildDistrictArticlePool(
  feed: GeneratedHomepageFeed
): HomeArticle[] {
  const seen = new Set<string>();
  const out: HomeArticle[] = [];

  const push = (article: HomeArticle) => {
    if (seen.has(article.id)) return;
    seen.add(article.id);
    out.push(article);
  };

  for (const article of feed.liveWire) push(article);
  for (const article of feed.regionalHighlights) push(article);
  for (const article of feed.trending) {
    if (resolveFeaturedDistrictSlug(article)) push(article);
  }

  return out;
}

export function filterArticlesByDistrict(
  articles: HomeArticle[],
  slug: FeaturedDistrictSlug
): HomeArticle[] {
  return articles.filter(
    (article) => assignFeaturedDistrictSlug(article) === slug
  );
}

export function countArticlesByDistrict(
  articles: HomeArticle[]
): Record<FeaturedDistrictSlug, number> {
  const counts: Record<FeaturedDistrictSlug, number> = {
    bilaspur: 0,
    raipur: 0,
    durg: 0,
    rajnandgaon: 0,
  };
  for (const article of articles) {
    counts[assignFeaturedDistrictSlug(article)] += 1;
  }
  return counts;
}

export function defaultFeaturedDistrict(
  counts: Record<FeaturedDistrictSlug, number>
): FeaturedDistrictSlug {
  let best: FeaturedDistrictSlug = "raipur";
  let max = -1;
  for (const slug of FEATURED_DISTRICT_SLUGS) {
    if (counts[slug] > max) {
      max = counts[slug];
      best = slug;
    }
  }
  return best;
}
