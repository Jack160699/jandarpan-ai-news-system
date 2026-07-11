/**
 * Canonical responsive image sizes for editorial cards.
 * Re-exported from lib for design-system ownership of card image contracts.
 */
import {
  IMG_CARD_COMPACT,
  IMG_CARD_FEATURED,
  IMG_CARD_FEED,
  IMG_HERO_LEAD,
} from "@/lib/images/homepage-sizes";

export {
  IMG_CARD_COMPACT,
  IMG_CARD_EDITORIAL,
  IMG_CARD_FEATURED,
  IMG_CARD_FEED,
  IMG_CARD_LEAD,
  IMG_HERO_LEAD,
  IMG_HERO_THUMB,
  widthFromSizes,
} from "@/lib/images/homepage-sizes";

export function editorialImageSizes(
  variant: "standard" | "compact" | "featured" | "hero" | "summary"
): string {
  switch (variant) {
    case "hero":
      return IMG_HERO_LEAD;
    case "featured":
      return IMG_CARD_FEATURED;
    case "compact":
    case "summary":
      return IMG_CARD_COMPACT;
    default:
      return IMG_CARD_FEED;
  }
}
