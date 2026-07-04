/**
 * Intelligent editorial image prompt builder — uses full article context
 */

import { createHash } from "crypto";
import {
  summarizeContextForPrompt,
  type EditorialImageContext,
} from "@/lib/news/ai/editorial-image-context";
import {
  BRAND_VISUAL,
  getCategoryVisualTemplate,
  hindiFriendlyCompositionNotes,
} from "@/lib/news/ai/editorial-image-brand";
import { getDistrictVisualCues } from "@/lib/news/ai/editorial-image-location";
import type { ModerationResult } from "@/lib/news/ai/editorial-image-moderation";
import {
  getStyleGuidance,
  getUrgencyStyleTier,
} from "@/lib/news/ai/editorial-image-style";

export function hashImagePrompt(prompt: string): string {
  return createHash("sha256").update(prompt.trim()).digest("hex").slice(0, 16);
}

export function buildIntelligentEditorialPrompt(input: {
  context: EditorialImageContext;
  moderation: ModerationResult;
  repairAttempt?: number;
}): string {
  const { context, moderation, repairAttempt = 0 } = input;

  if (context.customPrompt?.trim()) {
    return [
      context.customPrompt.trim(),
      BRAND_VISUAL.palette,
      hindiFriendlyCompositionNotes(),
      "Forbidden: photorealism, logos, embedded text, identifiable real people.",
    ].join(" ");
  }

  const style = getStyleGuidance(context.theme);
  const categoryTemplate = getCategoryVisualTemplate(context.category);
  const urgencyTier = getUrgencyStyleTier(
    context.urgencyScore,
    context.entities.isBreaking
  );

  const locationCues = context.location.district
    ? getDistrictVisualCues(context.location.district)
    : context.location.state === "chhattisgarh"
      ? "Chhattisgarh state identity: sal forest, Mahanadi river, tribal art borders, monsoon sky"
      : context.location.scope === "international"
        ? "International desk: neutral global map wireframe, diplomatic abstract shapes"
        : "Pan-India civic context: diverse community silhouettes (non-identifiable)";

  const contextBlock = summarizeContextForPrompt(context);

  const safetyBlock = moderation.forceSymbolicOnly
    ? "ONLY abstract symbolic shapes, maps, icons, silhouettes without identifiable faces. No humans resembling real people."
    : "No identifiable real people, no politician likeness, no photorealism, no fake disaster photography.";

  const repairNote =
    repairAttempt > 0
      ? `Repair pass ${repairAttempt}: simplify composition, strengthen single metaphor matching headline theme.`
      : "";

  const peopleNote =
    context.entities.people.length > 0
      ? `Public figures mentioned — use generic civic silhouettes only, never likeness of: ${context.entities.people.join(", ")}.`
      : "";

  return [
    BRAND_VISUAL.style,
    `Create a ${urgencyTier} hero illustration for ${BRAND_VISUAL.name}.`,
    `Story theme: ${context.theme}. ${style.artisticDirection}`,
    `Headline context: ${moderation.sanitizedHeadline}.`,
    contextBlock,
    `Category: ${context.category}. ${categoryTemplate.motifs}`,
    `Mood: ${style.mood}. Category mood: ${categoryTemplate.mood}.`,
    `Composition: ${style.composition}. ${categoryTemplate.composition}.`,
    `Color: ${style.colorNotes}. ${BRAND_VISUAL.palette}.`,
    `Regional setting: ${locationCues}.`,
    peopleNote,
    BRAND_VISUAL.typographySpace,
    hindiFriendlyCompositionNotes(),
    "Visual language: premium editorial illustration — soft gradients, symbolic storytelling, credible Indian newsroom art direction.",
    `Avoid: ${[...style.avoid, "photographs", "photorealism", "logos", "watermarks", "embedded text"].join(", ")}.`,
    safetyBlock,
    repairNote,
    "Output: single cohesive 16:9 hero illustration optimized for mobile and OpenGraph crop.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildRetryPromptVariant(input: {
  basePrompt: string;
  attempt: number;
  context: EditorialImageContext;
  qualityFlags: string[];
}): string {
  const style = getStyleGuidance(input.context.theme);
  const flagHints: Record<string, string> = {
    low_contrast: "Increase contrast and color separation between focal subject and background.",
    low_width: "Ensure wide 16:9 composition with clear horizontal storytelling.",
    awkward_aspect: "Strict 16:9 landscape hero framing.",
    possible_text_artifacts: "Absolutely no text, letters, numbers, or signage in the image.",
    low_edge_clarity: "Sharpen symbolic shapes with cleaner edges, reduce muddy gradients.",
    low_context_relevance: `Strengthen visual metaphor for: ${input.context.headline.slice(0, 80)}.`,
    oversaturated: "Reduce saturation, use restrained Jan Darpan palette.",
    possible_face: "Remove all human faces — use silhouettes and abstract icons only.",
  };

  const hints = input.qualityFlags
    .map((f) => flagHints[f])
    .filter(Boolean)
    .join(" ");

  const variant =
    input.attempt === 1
      ? "Simplify — fewer elements, one strong metaphor matching the headline."
      : input.attempt === 2
        ? "Minimal poster style — two-color symbolic icon centered."
        : "Ultra-minimal editorial symbol on clean background.";

  return [
    input.basePrompt,
    `RETRY ${input.attempt + 1}: ${variant}`,
    hints,
    style.artisticDirection,
    getDistrictVisualCues(input.context.location.district),
    "Increase clarity for mobile hero crop 16:9.",
  ]
    .filter(Boolean)
    .join(" ");
}
