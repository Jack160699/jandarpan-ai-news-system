/**
 * Module 4 — Internal Link Engine
 */

import { SITE_URL } from "@/lib/seo/constants";
import type { ExecutionArticle, SuggestionDraft } from "@/lib/seo-execution/types";

export interface LinkSuggestion {
  url: string;
  slug: string;
  anchor: string;
  link_type: "related_story" | "district" | "category" | "topic" | "evergreen" | "recent";
  confidence: number;
}

export function generateInternalLinkSuggestions(
  article: ExecutionArticle,
  related: ExecutionArticle[]
): SuggestionDraft[] {
  const links: LinkSuggestion[] = [];
  const existing = new Set(
    Array.isArray(article.editorial_metadata?.related_slugs)
      ? (article.editorial_metadata.related_slugs as string[])
      : []
  );

  for (const rel of related.slice(0, 4)) {
    if (existing.has(rel.slug)) continue;
    links.push({
      url: `${SITE_URL}/news/${rel.slug}`,
      slug: rel.slug,
      anchor: rel.headline.slice(0, 60),
      link_type: "related_story",
      confidence: rel.district === article.district ? 0.85 : 0.7,
    });
  }

  if (article.district) {
    links.push({
      url: `${SITE_URL}/district/${article.district}`,
      slug: article.district,
      anchor: `${article.district} समाचार`,
      link_type: "district",
      confidence: 0.9,
    });
  }

  if (article.category) {
    links.push({
      url: `${SITE_URL}/topic/${article.category}`,
      slug: article.category,
      anchor: `${article.category} news`,
      link_type: "category",
      confidence: 0.75,
    });
  }

  for (const rel of related.slice(0, 2)) {
    links.push({
      url: `${SITE_URL}/news/${rel.slug}`,
      slug: rel.slug,
      anchor: rel.headline.slice(0, 50),
      link_type: "recent",
      confidence: 0.65,
    });
  }

  if (links.length === 0) return [];

  const avgConfidence =
    links.reduce((s, l) => s + l.confidence, 0) / links.length;

  return [
    {
      suggestion_type: "internal_link",
      field_key: "related_slugs",
      current_value: JSON.stringify([...existing]),
      suggested_value: JSON.stringify(links),
      reason: `${links.length} internal link opportunities — related stories, district, and category pages.`,
      expected_impact: "Improved crawl depth and topical authority (+3–8% SEO score)",
      confidence: Math.round(avgConfidence * 100) / 100,
      priority: links.length >= 3 ? "high" : "medium",
      metadata: { links },
    },
  ];
}
