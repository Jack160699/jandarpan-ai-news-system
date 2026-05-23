/**
 * Internal linking graph — category hubs, related stories, trending anchors
 */

import { categoryPath, CATEGORY_SEO } from "@/lib/seo/categories";
import { storyPath } from "@/lib/news/slug";
import type { NewsArticleRow } from "@/lib/types/news-article";

export type InternalLink = {
  href: string;
  label: string;
  labelHi?: string;
};

export function getCategoryHubLinks(limit = 8): InternalLink[] {
  return CATEGORY_SEO.slice(0, limit).map((c) => ({
    href: c.path,
    label: c.titleEn,
    labelHi: c.titleHi,
  }));
}

export function getStoryInternalLinks(input: {
  article: NewsArticleRow;
  related: NewsArticleRow[];
}): InternalLink[] {
  const catSlug =
    input.article.category === "local" ? "chhattisgarh" : input.article.category;

  const hub: InternalLink = {
    href: categoryPath(catSlug),
    label: `More ${input.article.category} news`,
  };

  const relatedLinks: InternalLink[] = input.related.slice(0, 5).map((a) => ({
    href: storyPath(a.slug ?? a.id),
    label: (a.ai_headline ?? a.title).slice(0, 72),
  }));

  return [hub, ...relatedLinks];
}

export function getHomepageDiscoveryLinks(): InternalLink[] {
  return [
    { href: "/", label: "Latest headlines" },
    { href: "/search", label: "Search newsroom" },
    { href: "/archive", label: "Living archive" },
    ...getCategoryHubLinks(6),
  ];
}

export function buildCategoryArticleLinks(
  articles: Array<{ slug: string; headline: string }>,
  limit = 24
): InternalLink[] {
  return articles.slice(0, limit).map((a) => ({
    href: storyPath(a.slug),
    label: a.headline.slice(0, 80),
  }));
}
