/**
 * Production aspect ratios — consistent crops across the platform
 */

export type MediaAspect = "16:9" | "4:3" | "4:5" | "1:1" | "fill";

/** @deprecated Legacy alias — maps to MediaAspect */
export type ThumbAspect =
  | MediaAspect
  | "wide"
  | "cinematic"
  | "standard"
  | "portrait"
  | "reel"
  | "square";

export const ASPECT_16_9 = 16 / 9;
export const ASPECT_4_3 = 4 / 3;
export const ASPECT_4_5 = 4 / 5;

export const MEDIA_ASPECT_CSS: Record<Exclude<MediaAspect, "fill">, string> = {
  "16:9": `${16} / ${9}`,
  "4:3": `${4} / ${3}`,
  "4:5": `${4} / ${5}`,
  "1:1": `${1} / ${1}`,
};

/** Normalize legacy aspect names */
export function normalizeMediaAspect(aspect?: ThumbAspect): MediaAspect {
  switch (aspect) {
    case "4:5":
    case "portrait":
    case "reel":
      return "4:5";
    case "4:3":
    case "standard":
      return "4:3";
    case "1:1":
    case "square":
      return "1:1";
    case "fill":
      return "fill";
    case "16:9":
    case "wide":
    case "cinematic":
    default:
      return "16:9";
  }
}

export function aspectClassName(aspect: MediaAspect): string {
  if (aspect === "fill") return "media-frame--fill";
  return `media-frame--${aspect.replace(":", "-")}`;
}

export function imgPositionClass(aspect: MediaAspect): string {
  switch (aspect) {
    case "4:5":
      return "media-frame__img--4-5";
    case "4:3":
      return "media-frame__img--4-3";
    case "1:1":
      return "media-frame__img--1-1";
    default:
      return "media-frame__img--16-9";
  }
}

/** CDN crop hint — matches display aspect */
export function cdnCropForAspect(aspect: MediaAspect): { w: number; h: number } {
  switch (aspect) {
    case "4:5":
      return { w: 800, h: 1000 };
    case "4:3":
      return { w: 960, h: 720 };
    case "1:1":
      return { w: 720, h: 720 };
    case "fill":
    case "16:9":
    default:
      return { w: 1280, h: 720 };
  }
}
