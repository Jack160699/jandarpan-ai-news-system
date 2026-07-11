/**
 * Module 7 — Image SEO
 */

import type { ExecutionArticle, SuggestionDraft } from "@/lib/seo-execution/types";

export function generateImageSeoSuggestions(
  article: ExecutionArticle
): SuggestionDraft[] {
  if (!article.hero_image_url) {
    return [
      {
        suggestion_type: "og_image",
        field_key: "hero_image_url",
        current_value: null,
        suggested_value: "Add a hero image — required for Google News and Discover eligibility.",
        reason: "No hero image — critical for image SEO and social sharing.",
        expected_impact: "Google News and Discover visibility",
        confidence: 0.95,
        priority: "high",
      },
    ];
  }

  const meta = article.editorial_metadata;
  const imageMeta = (meta.image as Record<string, unknown>) ?? {};
  const headline = article.headline;
  const district = article.district ?? "Chhattisgarh";

  const alt = `${headline} — ${district} news photo`.slice(0, 125);
  const caption = `${headline.slice(0, 100)} (Photo: Jandarpan News)`.slice(0, 150);
  const title = headline.slice(0, 70);
  const description = `Image related to ${headline} in ${district}.`.slice(0, 160);

  const suggestions: SuggestionDraft[] = [];
  const currentAlt = (imageMeta.alt as string) ?? null;

  if (!currentAlt || currentAlt.length < 20) {
    suggestions.push({
      suggestion_type: "image_alt",
      field_key: "image_alt",
      current_value: currentAlt,
      suggested_value: alt,
      reason: "Alt text missing or too short — accessibility and image search opportunity.",
      expected_impact: "Image pack and accessibility compliance",
      confidence: 0.85,
      priority: "high",
    });
  }

  suggestions.push({
    suggestion_type: "image_caption",
    field_key: "image_caption",
    current_value: (imageMeta.caption as string) ?? null,
    suggested_value: caption,
    reason: "Descriptive caption improves engagement and image SEO.",
    expected_impact: "Better image SERP context",
    confidence: 0.7,
    priority: "medium",
  });

  suggestions.push({
    suggestion_type: "image_title",
    field_key: "image_title",
    current_value: (imageMeta.title as string) ?? null,
    suggested_value: title,
    reason: "Image title attribute for hover and SEO.",
    expected_impact: "Minor image SEO boost",
    confidence: 0.6,
    priority: "low",
  });

  suggestions.push({
    suggestion_type: "image_description",
    field_key: "image_description",
    current_value: (imageMeta.description as string) ?? null,
    suggested_value: description,
    reason: "Extended image description for schema and OG.",
    expected_impact: "Rich result eligibility",
    confidence: 0.65,
    priority: "low",
  });

  if (!imageMeta.og_url) {
    suggestions.push({
      suggestion_type: "og_image",
      field_key: "og_image",
      current_value: null,
      suggested_value: article.hero_image_url,
      reason: "Set OG image URL for consistent social previews.",
      expected_impact: "Improved social CTR",
      confidence: 0.8,
      priority: "medium",
    });
  }

  return suggestions;
}
