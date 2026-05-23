/**
 * Production aspect ratios — 16:9 and 4:5 only (+ fill for parent-sized boxes)
 */

export type MediaAspect = "16:9" | "4:5" | "fill";

/** @deprecated Legacy alias — maps to MediaAspect */
export type ThumbAspect = MediaAspect | "wide" | "cinematic" | "standard" | "portrait" | "reel" | "square";

export const ASPECT_16_9 = 16 / 9;
export const ASPECT_4_5 = 4 / 5;

export const MEDIA_ASPECT_CSS: Record<Exclude<MediaAspect, "fill">, string> = {
  "16:9": `${16} / ${9}`,
  "4:5": `${4} / ${5}`,
};

/** Normalize legacy aspect names to 16:9 or 4:5 */
export function normalizeMediaAspect(aspect?: ThumbAspect): MediaAspect {
  switch (aspect) {
    case "4:5":
    case "portrait":
    case "reel":
    case "square":
      return "4:5";
    case "fill":
      return "fill";
    case "16:9":
    case "wide":
    case "cinematic":
    case "standard":
    default:
      return "16:9";
  }
}

export function aspectClassName(aspect: MediaAspect): string {
  if (aspect === "fill") return "media-frame--fill";
  return `media-frame--${aspect.replace(":", "-")}`;
}

/** CDN crop hint — 16:9 landscape vs 4:5 portrait */
export function cdnCropForAspect(aspect: MediaAspect): { w: number; h: number } {
  if (aspect === "4:5") return { w: 800, h: 1000 };
  return { w: 1280, h: 720 };
}
