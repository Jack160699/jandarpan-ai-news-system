/**
 * Editorial image prompt moderation + branded contextual prompts
 */

import {
  buildIntelligentEditorialPrompt,
  hashImagePrompt,
} from "@/lib/news/ai/editorial-image-prompt-builder";
import type { EditorialImageContext } from "@/lib/news/ai/editorial-image-context";

const PHOTOREAL_BAN_RE =
  /\b(photo(?:graph)?|photorealistic|realistic photo|cctv|dashcam|selfie|portrait of|headshot|paparazzi)\b/i;

const POLITICIAN_RE =
  /\b(modi|rahul|gandhi|kejriwal|yogi|shah|nadda|baghel|sahu|chouhan|minister\s+\w+\s+portrait|pm\s+modi|cm\s+)\b/i;

const MISLEADING_INCIDENT_RE =
  /\b(actual\s+scene|on\s+the\s+ground\s+photo|crime\s+scene\s+photo|accident\s+photo|dead\s+body|corpse|gore|blood\s+splatter)\b/i;

const DISASTER_PHOTO_RE =
  /\b(flood\s+photo|earthquake\s+photo|fire\s+photo|explosion\s+photo|train\s+accident\s+photo|bridge\s+collapse\s+photo)\b/i;

const SENSATIONAL_RE =
  /\b(shocking\s+image|graphic\s+image|exclusive\s+leak\s+photo)\b/i;

export type ModerationResult = {
  allowed: boolean;
  flags: string[];
  forceSymbolicOnly: boolean;
  sanitizedHeadline: string;
};

export { hashImagePrompt };

export function moderateEditorialImageContext(input: {
  headline: string;
  eventSummary?: string | null;
  category?: string | null;
}): ModerationResult {
  const combined = `${input.headline} ${input.eventSummary ?? ""}`;
  const flags: string[] = [];

  if (PHOTOREAL_BAN_RE.test(combined)) flags.push("photorealistic_language");
  if (POLITICIAN_RE.test(combined)) flags.push("politician_reference");
  if (MISLEADING_INCIDENT_RE.test(combined)) flags.push("misleading_incident");
  if (DISASTER_PHOTO_RE.test(combined)) flags.push("disaster_photo_intent");
  if (SENSATIONAL_RE.test(combined)) flags.push("sensational_imagery");

  const forceSymbolicOnly =
    flags.includes("politician_reference") ||
    flags.includes("misleading_incident") ||
    flags.includes("disaster_photo_intent") ||
    flags.includes("sensational_imagery");

  const allowed = !flags.includes("photorealistic_language");

  const sanitizedHeadline = input.headline
    .replace(POLITICIAN_RE, "public figure")
    .replace(DISASTER_PHOTO_RE, "regional event")
    .slice(0, 120);

  return { allowed, flags, forceSymbolicOnly, sanitizedHeadline };
}

/** @deprecated Use buildIntelligentEditorialPrompt with full EditorialImageContext */
export function buildEditorialImagePrompt(input: {
  headline: string;
  category: string;
  region: string | null;
  urgencyScore: number;
  eventSummary: string | null;
  moderation: ModerationResult;
  repairAttempt?: number;
}): string {
  const context: EditorialImageContext = {
    headline: input.headline,
    summary: input.eventSummary ?? "",
    bodyExcerpt: "",
    category: input.category,
    region: input.region,
    urgencyScore: input.urgencyScore,
    tags: [input.category],
    location: {
      district: null,
      state: input.region,
      country: "india",
      scope: "state",
      matchedTerms: [],
    },
    entities: {
      theme: "general",
      people: [],
      organizations: [],
      keywords: [],
      isBreaking: input.urgencyScore >= 75,
    },
    theme: "general",
    signalTitles: [],
  };

  return buildIntelligentEditorialPrompt({
    context,
    moderation: input.moderation,
    repairAttempt: input.repairAttempt,
  });
}

export function moderateGeneratedPrompt(prompt: string): {
  safe: boolean;
  flags: string[];
} {
  const flags: string[] = [];
  if (PHOTOREAL_BAN_RE.test(prompt)) flags.push("prompt_photorealistic");
  if (MISLEADING_INCIDENT_RE.test(prompt)) flags.push("prompt_misleading");
  if (POLITICIAN_RE.test(prompt) && !/no politician/i.test(prompt)) {
    flags.push("prompt_politician");
  }
  return { safe: flags.length === 0, flags };
}
