/**
 * Module 3 — Meta Optimizer
 */

import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import type { ExecutionArticle, SuggestionDraft } from "@/lib/seo-execution/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function generateMetaSuggestions(
  article: ExecutionArticle
): SuggestionDraft[] {
  const keyword = getPrimaryKeyword(article.headline) ?? article.district ?? "news";
  const currentTitle = article.seo_title ?? article.headline;
  const currentDesc = article.seo_description ?? article.summary ?? "";
  const meta = article.editorial_metadata;

  const metaTitle = currentTitle.slice(0, 60);
  const metaDesc = (
    currentDesc.length >= 80 && currentDesc.length <= 160
      ? currentDesc
      : `${article.headline}. ${article.district ? `${article.district} समाचार` : "छत्तीसगढ़"} की ताज़ा खबर Jandarpan News पर पढ़ें।`
  ).slice(0, 155);

  const ogTitle = metaTitle;
  const ogDesc = metaDesc;
  const twitterTitle = metaTitle.slice(0, 70);
  const twitterDesc = metaDesc.slice(0, 200);
  const slugRec = slugify(
    `${article.district ?? "cg"}-${article.headline}`.replace(/\s+/g, "-")
  );

  const suggestions: SuggestionDraft[] = [];

  const add = (
    type: SuggestionDraft["suggestion_type"],
    field: string,
    current: string | null,
    suggested: string,
    reason: string,
    priority: SuggestionDraft["priority"] = "medium"
  ) => {
    if (suggested && suggested !== (current ?? "")) {
      suggestions.push({
        suggestion_type: type,
        field_key: field,
        current_value: current,
        suggested_value: suggested,
        reason,
        expected_impact: "Better SERP snippet and social sharing CTR",
        confidence: 0.78,
        priority,
      });
    }
  };

  add("meta_title", "seo_title", currentTitle, metaTitle, "Optimized meta title length for Google SERP.");
  add(
    "meta_description",
    "seo_description",
    currentDesc || null,
    metaDesc,
    currentDesc.length < 80
      ? "Meta description too short — expand for better CTR."
      : currentDesc.length > 160
        ? "Meta description truncated in SERP — shorten to 155 chars."
        : "Refined meta description with keyword and CTA.",
    currentDesc.length < 80 || currentDesc.length > 160 ? "high" : "medium"
  );

  add(
    "og_title",
    "og_title",
    (meta.og_title as string) ?? null,
    ogTitle,
    "Open Graph title for Facebook/WhatsApp shares."
  );
  add(
    "og_description",
    "og_description",
    (meta.og_description as string) ?? null,
    ogDesc,
    "Open Graph description for social previews."
  );
  add(
    "twitter_title",
    "twitter_title",
    (meta.twitter_title as string) ?? null,
    twitterTitle,
    "Twitter card title optimization."
  );
  add(
    "twitter_description",
    "twitter_description",
    (meta.twitter_description as string) ?? null,
    twitterDesc,
    "Twitter card description."
  );

  if (slugRec !== article.slug) {
    suggestions.push({
      suggestion_type: "slug_recommendation",
      field_key: "slug",
      current_value: article.slug,
      suggested_value: slugRec,
      reason: `Slug could include keyword "${keyword}" for SEO — requires careful redirect if changed.`,
      expected_impact: "Improved URL relevance (apply only with redirect plan)",
      confidence: 0.55,
      priority: "low",
      metadata: { requires_redirect: true },
    });
  }

  return suggestions;
}
