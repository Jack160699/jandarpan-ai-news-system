/**
 * Editorial image brief — compact story brief for prompts + decisioning.
 */

import type { EditorialImageContext } from "@/lib/news/ai/editorial-image-context";
import type { StorySensitivity } from "@/lib/news/ai/editorial-image-sensitivity";

export type EditorialImageBrief = {
  headline: string;
  category: string;
  district: string | null;
  eventType: string;
  generationAppropriate: boolean;
  sensitive: boolean;
  preferredFallback: "curated" | "text_only";
  summary: string;
};

export function buildEditorialImageBrief(
  context: EditorialImageContext,
  sensitivity?: StorySensitivity
): EditorialImageBrief {
  const sensitive = sensitivity?.sensitive ?? false;
  const generationAppropriate =
    sensitivity?.generationAppropriate ?? !sensitive;
  const preferredFallback =
    sensitivity?.preferredFallback ??
    (generationAppropriate ? "curated" : "text_only");

  return {
    headline: context.headline.slice(0, 160),
    category: context.category,
    district: context.location.district,
    eventType: context.theme,
    generationAppropriate,
    sensitive,
    preferredFallback,
    summary: (context.summary || context.bodyExcerpt).slice(0, 280),
  };
}

/** Compact prompt fragment derived from the brief. */
export function briefToPromptFragment(brief: EditorialImageBrief): string {
  const parts = [
    `Event type: ${brief.eventType}.`,
    brief.district ? `District focus: ${brief.district}.` : null,
    brief.sensitive
      ? "Sensitive story — keep symbolism restrained, avoid graphic or documentary cues."
      : null,
    `Category: ${brief.category}.`,
    brief.summary ? `Story gist: ${brief.summary}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}
