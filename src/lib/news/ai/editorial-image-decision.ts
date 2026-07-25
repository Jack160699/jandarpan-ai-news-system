/**
 * Editorial image strategy decisions (A/B/C/D).
 *
 * A — prefer source/wire image
 * B — attempt paid AI illustration
 * C — curated category/region fallback
 * D — text-only (no hero image)
 */

import type { EditorialImageBrief } from "@/lib/news/ai/editorial-image-brief";

export type EditorialImageDecisionCode = "A" | "B" | "C" | "D";

export type EditorialImageDecision = {
  code: EditorialImageDecisionCode;
  reason: string;
  /** When true, enqueue async image worker after publish. */
  enqueueJob: boolean;
};

export function decideEditorialImageStrategy(input: {
  brief: EditorialImageBrief;
  costTierAllowsImage: boolean;
  hasSourceImage: boolean;
  providerAvailable: boolean;
  isShortAlert?: boolean;
  skipAi?: boolean;
}): EditorialImageDecision {
  const {
    brief,
    costTierAllowsImage,
    hasSourceImage,
    providerAvailable,
    isShortAlert = false,
    skipAi = false,
  } = input;

  if (
    !brief.generationAppropriate ||
    brief.preferredFallback === "text_only"
  ) {
    return {
      code: "D",
      reason: brief.sensitive
        ? "sensitive_story_text_only"
        : "generation_not_appropriate",
      enqueueJob: false,
    };
  }

  if (hasSourceImage) {
    return {
      code: "A",
      reason: "source_image_available",
      enqueueJob: true,
    };
  }

  if (
    costTierAllowsImage &&
    providerAvailable &&
    !skipAi &&
    !isShortAlert
  ) {
    return {
      code: "B",
      reason: "ai_illustration_eligible",
      enqueueJob: true,
    };
  }

  if (isShortAlert && !hasSourceImage) {
    return {
      code: "C",
      reason: "short_alert_curated_fallback",
      enqueueJob: false,
    };
  }

  if (!costTierAllowsImage || skipAi || !providerAvailable) {
    return {
      code: "C",
      reason: !costTierAllowsImage
        ? "cost_tier_blocks_ai"
        : skipAi
          ? "ai_skipped"
          : "provider_unavailable",
      enqueueJob: false,
    };
  }

  return {
    code: "C",
    reason: "default_curated_fallback",
    enqueueJob: false,
  };
}
