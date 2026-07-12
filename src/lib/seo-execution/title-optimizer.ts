/**
 * Module 2 — Title Optimizer (suggestions only — originals untouched)
 */

import { analyzeHeadline } from "@/lib/seo-intelligence/headline-analyzer";
import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import type { ExecutionArticle, SuggestionDraft } from "@/lib/seo-execution/types";

function trimTitle(text: string, max = 70): string {
  return text.trim().slice(0, max);
}

export function generateTitleSuggestions(
  article: ExecutionArticle
): SuggestionDraft[] {
  const current = article.seo_title ?? article.headline;
  const keyword = getPrimaryKeyword(article.headline) ?? article.district ?? "छत्तीसगढ़";
  const district = article.district
    ? article.district.charAt(0).toUpperCase() + article.district.slice(1)
    : "Chhattisgarh";

  const primary = trimTitle(
    `${district}: ${article.headline.replace(/^(ब्रेकिंग|Breaking)\s*/i, "").trim()}`
  );

  const altA = trimTitle(`${article.headline} — ${district} अपडेट`);
  const altB = trimTitle(`${keyword} | ${article.headline.slice(0, 45)}`);
  const breaking = trimTitle(`ब्रेकिंग: ${article.headline}`);
  const discover = trimTitle(`${article.headline} — जानें पूरी खबर`);
  const googleNews = trimTitle(`${article.headline} | Jandarpan News`);

  const analysis = analyzeHeadline(current);
  const reason =
    analysis.length > 90
      ? "Title exceeds optimal length for SERP display."
      : analysis.headlineScore < 70
        ? "Title scores below benchmark — keyword or district placement can improve."
        : "Alternative titles for A/B testing across SERP, Discover, and Google News.";

  const base = {
    reason,
    expected_impact: "Improved CTR and SERP visibility (+5–15% estimated)",
    confidence: 0.72,
    priority: analysis.headlineScore < 65 ? ("high" as const) : ("medium" as const),
  };

  const suggestions: SuggestionDraft[] = [];

  if (primary !== current) {
    suggestions.push({
      suggestion_type: "title_primary",
      field_key: "seo_title",
      current_value: current,
      suggested_value: primary,
      ...base,
    });
  }

  const variants: Array<{ type: SuggestionDraft["suggestion_type"]; value: string }> = [
    { type: "title_alt_a", value: altA },
    { type: "title_alt_b", value: altB },
    { type: "title_breaking", value: breaking },
    { type: "title_discover", value: discover },
    { type: "title_google_news", value: googleNews },
  ];

  for (const v of variants) {
    if (v.value !== current) {
      suggestions.push({
        suggestion_type: v.type,
        field_key: "seo_title_variant",
        current_value: current,
        suggested_value: v.value,
        ...base,
        expected_impact: "Channel-specific title for testing — not auto-applied to headline.",
        confidence: 0.65,
        priority: "low",
        metadata: { channel: v.type.replace("title_", "") },
      });
    }
  }

  return suggestions;
}
