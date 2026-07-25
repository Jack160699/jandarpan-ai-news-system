/**
 * Story sensitivity assessment for editorial image generation.
 */

export type StorySensitivity = {
  sensitive: boolean;
  generationAppropriate: boolean;
  preferredFallback: "curated" | "text_only";
  flags: string[];
  level: "low" | "medium" | "high";
};

const VIOLENCE_RE =
  /\b(murder|killed|shooting|rape|assault|massacre|lynch|dead\s+body|corpse|behead|bombing)\b|हत्या|बलात्कार|गोली|लाश/i;

const GRAPHIC_RE =
  /\b(gore|graphic\s+violence|bloodbath|torture|mutilat)\b|खूनी|क्रूर/i;

const CHILD_HARM_RE =
  /\b(child\s+abuse|minor\s+assault|underage)\b|बाल\s*शोषण/i;

/**
 * Assess whether a story is sensitive for AI image generation.
 */
export function assessStorySensitivity(input: {
  headline: string;
  eventSummary?: string | null;
  bodyExcerpt?: string | null;
  category?: string | null;
  theme?: string | null;
  people?: string[];
}): StorySensitivity {
  const combined = [
    input.headline,
    input.eventSummary ?? "",
    input.bodyExcerpt ?? "",
    input.category ?? "",
    input.theme ?? "",
    ...(input.people ?? []),
  ].join(" ");

  const flags: string[] = [];
  if (VIOLENCE_RE.test(combined)) flags.push("violence");
  if (GRAPHIC_RE.test(combined)) flags.push("graphic");
  if (CHILD_HARM_RE.test(combined)) flags.push("child_harm");
  if ((input.people?.length ?? 0) > 0) flags.push("named_people");

  const high = flags.includes("child_harm") || flags.includes("graphic");
  const medium = flags.includes("violence") || flags.includes("named_people");
  const level: StorySensitivity["level"] = high
    ? "high"
    : medium
      ? "medium"
      : "low";

  const sensitive = flags.length > 0;
  const generationAppropriate = !high;
  const preferredFallback: StorySensitivity["preferredFallback"] = high
    ? "text_only"
    : "curated";

  return {
    sensitive,
    generationAppropriate,
    preferredFallback,
    flags,
    level,
  };
}
