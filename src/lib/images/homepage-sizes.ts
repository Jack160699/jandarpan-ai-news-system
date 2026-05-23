/** Mobile-first `sizes` for Next/Image — keeps payloads small on phones */

export const IMG_HERO_LEAD =
  "(max-width: 480px) 100vw, (max-width: 768px) 100vw, 520px";

export const IMG_HERO_THUMB = "120px";

export const IMG_CARD_LEAD =
  "(max-width: 480px) 100vw, (max-width: 768px) 65vw, 640px";

export const IMG_CARD_EDITORIAL =
  "(max-width: 480px) 90vw, (max-width: 640px) 50vw, 400px";

export const IMG_CARD_COMPACT = "(max-width: 480px) 22vw, 120px";

export const IMG_CARD_FEED =
  "(max-width: 480px) 92px, (max-width: 768px) 112px, 112px";

export const IMG_CARD_FEATURED =
  "(max-width: 480px) 100vw, (max-width: 768px) 100vw, 560px";

export const IMG_REEL_PREVIEW = "(max-width: 480px) 42vw, 180px";

/** Infer decode width from sizes string (2× for retina cap) */
export function widthFromSizes(sizes: string, cap = 720): number {
  const px = sizes.match(/(\d+)px/);
  if (px) return Math.min(cap, Number(px[1]) * 2);
  if (sizes.includes("100vw")) return Math.min(cap, 480);
  return Math.min(cap, 640);
}
