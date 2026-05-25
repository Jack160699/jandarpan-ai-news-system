/**
 * Featured homepage districts — filter pool without changing APIs.
 */

import { CG_DISTRICTS, type CgDistrict } from "@/lib/regional/districts";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

export const FEATURED_DISTRICT_SLUGS = [
  "bilaspur",
  "raipur",
  "durg",
  "raigarh",
  "korba",
  "jagdalpur",
] as const;

export type FeaturedDistrictSlug = (typeof FEATURED_DISTRICT_SLUGS)[number];

const FEATURED_SET = new Set<string>(FEATURED_DISTRICT_SLUGS);

/** Jagdalpur tab maps to Bastar bureau coverage */
const JAGDALPUR_MATCH = ["jagdalpur", "जगदलपुर", "bastar", "बस्तर"];

type FeaturedDistrictMeta = CgDistrict & { slug: FeaturedDistrictSlug };

const DISTRICT_BY_SLUG = new Map<FeaturedDistrictSlug, FeaturedDistrictMeta>();

for (const d of CG_DISTRICTS) {
  if (FEATURED_SET.has(d.slug)) {
    DISTRICT_BY_SLUG.set(d.slug as FeaturedDistrictSlug, {
      ...d,
      slug: d.slug as FeaturedDistrictSlug,
    });
  }
}

const bastar = CG_DISTRICTS.find((d) => d.slug === "bastar");
if (bastar) {
  DISTRICT_BY_SLUG.set("jagdalpur", {
    ...bastar,
    slug: "jagdalpur",
    name: "Jagdalpur",
    nameHi: "जगदलपुर",
    aliases: [...JAGDALPUR_MATCH],
  });
}

export function getFeaturedDistrict(slug: FeaturedDistrictSlug): FeaturedDistrictMeta {
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

function matchesJagdalpur(text: string): boolean {
  return JAGDALPUR_MATCH.some((alias) => text.includes(alias.toLowerCase()));
}

/** Match district from headline/tags; null when no explicit district signal */
export function resolveFeaturedDistrictSlug(
  article: HomeArticle
): FeaturedDistrictSlug | null {
  const text = articleSearchBlob(article);

  if (matchesJagdalpur(text)) return "jagdalpur";

  for (const slug of FEATURED_DISTRICT_SLUGS) {
    if (slug === "jagdalpur") continue;
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
  for (const article of feed.trending.slice(0, 16)) push(article);
  for (const article of feed.editorsPicks.supporting ?? []) push(article);

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
  const counts = Object.fromEntries(
    FEATURED_DISTRICT_SLUGS.map((s) => [s, 0])
  ) as Record<FeaturedDistrictSlug, number>;

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
