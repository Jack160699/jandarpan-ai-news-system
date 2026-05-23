/**
 * Editorial image prompt moderation + branded contextual prompts
 */

import { createHash } from "crypto";
import {
  BRAND_VISUAL,
  getCategoryVisualTemplate,
  getRegionVisualOverlay,
  hindiFriendlyCompositionNotes,
} from "@/lib/news/ai/editorial-image-brand";

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

export function hashImagePrompt(prompt: string): string {
  return createHash("sha256").update(prompt.trim()).digest("hex").slice(0, 16);
}

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

export function buildEditorialImagePrompt(input: {
  headline: string;
  category: string;
  region: string | null;
  urgencyScore: number;
  eventSummary: string | null;
  moderation: ModerationResult;
  repairAttempt?: number;
}): string {
  const template = getCategoryVisualTemplate(input.category);
  const urgency = input.urgencyScore;

  const style =
    urgency >= 75
      ? "dynamic Hamar Chhattisgarh editorial illustration — credible breaking energy, not sensational"
      : urgency >= 45
        ? "modern Indian newsroom editorial illustration — confident trustworthy composition"
        : "calm symbolic Hamar Chhattisgarh artwork — clear visual storytelling";

  const summarySlice = (input.eventSummary ?? "").slice(0, 220);

  const safetyBlock = input.moderation.forceSymbolicOnly
    ? "ONLY abstract symbolic shapes, maps, icons, silhouettes without identifiable faces. No humans resembling real people."
    : "No identifiable real people, no politician likeness, no photorealism, no fake disaster photography.";

  const repairNote =
    input.repairAttempt && input.repairAttempt > 0
      ? `Repair variant ${input.repairAttempt}: simplify and strengthen symbolism.`
      : "";

  return [
    `${BRAND_VISUAL.style}`,
    `Create a ${style} for ${BRAND_VISUAL.name} hero image.`,
    `Story theme (abstract): ${input.moderation.sanitizedHeadline}.`,
    `Category: ${input.category}. ${template.motifs}`,
    `Mood: ${template.mood}. Composition: ${template.composition}.`,
    getRegionVisualOverlay(input.region),
    summarySlice ? `Context: ${summarySlice}` : "",
    BRAND_VISUAL.palette,
    BRAND_VISUAL.typographySpace,
    hindiFriendlyCompositionNotes(),
    "Visual language: editorial illustration only — soft gradients, symbolic storytelling, premium newspaper art direction.",
    "Forbidden: photographs, photorealism, misleading incident imagery, gore, logos, watermarks, embedded text.",
    safetyBlock,
    repairNote,
    "Output: single cohesive 16:9 hero illustration optimized for mobile and OpenGraph crop.",
  ]
    .filter(Boolean)
    .join(" ");
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
