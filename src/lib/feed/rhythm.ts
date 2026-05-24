/**
 * Feed visual rhythm — alternating layouts for scroll retention
 */

export type FeedRhythmLayout = "standard" | "emphasis" | "compact";

/** Section spacing (20px) and card padding (16px) — match CSS tokens */
export const RHYTHM_SECTION_GAP = "1.25rem";
export const RHYTHM_CARD_PAD = "1rem";

/**
 * Cycle layouts for list items — avoids visual monotony in long feeds.
 * 0,3 standard · 1,4 emphasis · 2,5 compact
 */
export function feedRhythmLayout(index: number): FeedRhythmLayout {
  const mod = index % 6;
  if (mod === 2 || mod === 5) return "compact";
  if (mod === 1 || mod === 4) return "emphasis";
  return "standard";
}

export function feedVariantForRhythm(
  rhythm: FeedRhythmLayout,
  fallback: "standard" | "compact" | "lead" = "standard"
): "standard" | "compact" | "lead" {
  if (rhythm === "compact") return "compact";
  return fallback;
}
