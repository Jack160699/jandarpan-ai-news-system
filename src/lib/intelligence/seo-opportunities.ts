/**
 * SEO opportunity finder — gaps in titles, descriptions, structure
 */

import { scoreSeoQuality } from "@/lib/news/ai/editorial-intelligence";
import type { SeoOpportunity } from "@/lib/intelligence/types";

type ArticleSeoInput = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  article_body?: string | null;
};

export function findSeoOpportunities(articles: ArticleSeoInput[]): SeoOpportunity[] {
  return articles
    .map((a) => {
      const seoScore = scoreSeoQuality({
        headline: a.headline,
        seoTitle: a.seo_title ?? a.headline,
        seoDescription: a.seo_description ?? a.summary ?? "",
        summary: a.summary ?? "",
      });

      const gaps: string[] = [];
      let suggestedAction = "Optimize metadata";
      let priority = 1 - seoScore;

      const title = (a.seo_title ?? a.headline).trim();
      const desc = (a.seo_description ?? a.summary ?? "").trim();

      if (title.length < 20 || title.length > 70) {
        gaps.push("SEO title length out of range (40–65 ideal)");
        suggestedAction = "Rewrite SEO title for SERP";
        priority += 0.15;
      }
      if (desc.length < 110) {
        gaps.push("Meta description too short");
        suggestedAction = "Expand meta description to 120–160 chars";
        priority += 0.2;
      }
      if (!a.slug || a.slug.length < 8) {
        gaps.push("Weak URL slug");
        suggestedAction = "Regenerate keyword-rich slug";
        priority += 0.1;
      }
      const bodyLen = (a.article_body ?? "").length;
      if (bodyLen < 800) {
        gaps.push("Thin body for topical authority");
        suggestedAction = "Add district context and subheads";
        priority += 0.12;
      }

      if (gaps.length === 0 && seoScore >= 0.75) return null;

      return {
        articleId: a.id,
        slug: a.slug,
        headline: a.headline,
        seoScore,
        gap: gaps.join("; ") || "Below target SEO quality score",
        suggestedAction,
        priority: Math.min(1, Math.round(priority * 1000) / 1000),
      };
    })
    .filter((o): o is SeoOpportunity => o !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 20);
}
