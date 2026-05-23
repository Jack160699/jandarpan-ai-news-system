/**
 * Automatic editorial image repair — alternate prompts and tier retries
 */

import type { ModerationResult } from "@/lib/news/ai/editorial-image-moderation";
import {
  BRAND_VISUAL,
  getCategoryVisualTemplate,
  getRegionVisualOverlay,
  hindiFriendlyCompositionNotes,
} from "@/lib/news/ai/editorial-image-brand";

export function buildRepairPromptVariant(input: {
  basePrompt: string;
  attempt: number;
  category: string;
  region: string | null;
  moderation: ModerationResult;
}): string {
  const template = getCategoryVisualTemplate(input.category);
  const variant =
    input.attempt === 1
      ? "Simplify composition — fewer elements, stronger single metaphor."
      : input.attempt === 2
        ? "Use bold symbolic iconography only — map, river, community silhouette shapes."
        : "Minimal editorial poster style — two colors, large symbolic center.";

  return [
    input.basePrompt,
    `REPAIR PASS ${input.attempt + 1}: ${variant}`,
    template.motifs,
    getRegionVisualOverlay(input.region),
    hindiFriendlyCompositionNotes(),
    BRAND_VISUAL.palette,
    "Increase clarity for mobile hero crop 16:9.",
  ].join(" ");
}

export function buildSourceEnhancementHint(category: string): string {
  const template = getCategoryVisualTemplate(category);
  return `Editorial crop guidance: emphasize ${template.motifs} — tone ${template.mood}`;
}
