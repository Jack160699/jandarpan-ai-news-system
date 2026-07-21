/**
 * Featured homepage districts — filter pool without changing APIs.
 * Exact district matching only (no hash bucketing into unrelated districts).
 */

import { CG_DISTRICTS, type CgDistrict } from "@/lib/regional/districts";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import {
  articleMatchesDistrict,
  resolveArticleDistrictSlug,
} from "@/lib/district-intelligence/match";

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

/**
 * @deprecated Prefer resolveFeaturedDistrictSlug / articleMatchesDistrict.
 * Kept for call sites that need a featured tab id — returns null-safe
 * resolved slug or "raipur" only when used for display fallbacks, NOT for
 * filtering unrelated articles into a district pool.
 */
export function assignFeaturedDistrictSlug(
  article: HomeArticle
): FeaturedDistrictSlug {
  const resolved = resolveFeaturedDistrictSlug(article);
  if (resolved) return resolved;
  // Do NOT hash-bucket into unrelated districts (was causing Rajnandgaon → Durg).
  return "raipur";
}

export function buildDistrictArticlePool(
  feed: GeneratedHomepageFeed
): HomeArticle[] {
  const heroId = feed.editorsPicks.lead.id;
  const reserved = new Set<string>([
    heroId,
    ...feed.breakingTicker.map((a) => a.id),
    ...feed.trending.map((a) => a.id),
  ]);

  const source =
    feed.regionalHighlights.length > 0
      ? feed.regionalHighlights
      : feed.liveWire;

  return source.filter((a) => !reserved.has(a.id));
}

/**
 * Exact district filter — supports any CG district slug, not only featured tabs.
 * Never includes nearby/unrelated stories via hash assignment.
 */
export function filterArticlesByDistrict(
  articles: HomeArticle[],
  slug: string
): HomeArticle[] {
  const normalized =
    slug === "jagdalpur" ? "bastar" : slug;
  return articles.filter((article) => {
    if (slug === "jagdalpur" || slug === "bastar") {
      return (
        articleMatchesDistrict(article, "bastar") ||
        resolveFeaturedDistrictSlug(article) === "jagdalpur"
      );
    }
    return articleMatchesDistrict(article, normalized);
  });
}

export function countArticlesByDistrict(
  articles: HomeArticle[]
): Record<FeaturedDistrictSlug, number> {
  const counts = Object.fromEntries(
    FEATURED_DISTRICT_SLUGS.map((s) => [s, 0])
  ) as Record<FeaturedDistrictSlug, number>;

  for (const article of articles) {
    const resolved = resolveFeaturedDistrictSlug(article);
    if (resolved) counts[resolved] += 1;
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

export { resolveArticleDistrictSlug };
