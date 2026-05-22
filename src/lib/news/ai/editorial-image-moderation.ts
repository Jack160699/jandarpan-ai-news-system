/**
 * Editorial image prompt moderation — block misleading / photorealistic requests
 */

import { createHash } from "crypto";

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
}): string {
  const urgency = input.urgencyScore;
  const style =
    urgency >= 75
      ? "dynamic cinematic editorial illustration with subtle motion energy"
      : urgency >= 45
        ? "modern newspaper editorial illustration, confident composition"
        : "calm symbolic editorial artwork, clean visual storytelling";

  const regionHint =
    input.region === "chhattisgarh"
      ? "Chhattisgarh regional context (Raipur skyline hints, tribal patterns abstract, river motifs — symbolic only)"
      : input.region === "india"
        ? "Indian civic and community context, abstract regional cues"
        : "South Asia editorial context, abstract geography";

  const categoryHint = `News category: ${input.category}.`;
  const summarySlice = (input.eventSummary ?? "").slice(0, 200);

  const safetyBlock = input.moderation.forceSymbolicOnly
    ? "Use ONLY abstract symbolic shapes, maps, icons, silhouettes without identifiable faces. No humans resembling real people."
    : "No identifiable real people, no politician likeness, no photorealism.";

  return [
    `Create a ${style} for a digital newspaper hero image.`,
    `Story theme (abstract): ${input.moderation.sanitizedHeadline}.`,
    categoryHint,
    regionHint,
    summarySlice ? `Context cues: ${summarySlice}` : "",
    "Visual style: editorial illustration, newspaper art direction, muted trustworthy palette, soft gradients, symbolic storytelling.",
    "Forbidden: photographs, photorealism, fake disaster photos, fake politicians, misleading incident imagery, gore, logos, text overlays, watermarks.",
    safetyBlock,
    "Output: single cohesive hero illustration suitable for mobile and OpenGraph crop.",
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
