/**
 * Native in-feed ad creatives — house / regional placeholders until GAM fills slots
 */

export type NativeAdKind = "sponsored" | "regional" | "video" | "carousel";

export type NativeAdSize = "300x250" | "336x280" | "full-width";

export type NativeCarouselSlide = {
  id: string;
  title: string;
  subtitle?: string;
  targetUrl: string;
  imageUrl?: string;
};

export type NativeAdCreative = {
  kind: NativeAdKind;
  size: NativeAdSize;
  sponsorName: string;
  headline: string;
  description?: string;
  ctaLabel: string;
  targetUrl: string;
  imageUrl?: string;
  logoUrl?: string;
  videoPosterUrl?: string;
  slides?: NativeCarouselSlide[];
};

export const NATIVE_AD_INTERVAL = 4;

const KINDS: NativeAdKind[] = [
  "sponsored",
  "regional",
  "video",
  "carousel",
];

const SIZES: NativeAdSize[] = ["300x250", "336x280", "full-width"];

export function nativeAdSlotId(feedId: string, adIndex: number): string {
  return `feed_instream_${feedId}_${adIndex}`;
}

export function pickNativeAdKind(adIndex: number): NativeAdKind {
  return KINDS[adIndex % KINDS.length] ?? "sponsored";
}

export function pickNativeAdSize(adIndex: number): NativeAdSize {
  return SIZES[adIndex % SIZES.length] ?? "300x250";
}

/**
 * Native creatives — returns null until a real placement/config API is wired.
 * Must not invent sponsor brands, Unsplash stock, or partnership copy.
 */
export function getNativeAdCreative(adIndex: number): NativeAdCreative | null {
  void adIndex;
  return null;
}

export type FeedSegment<T> =
  | { type: "content"; item: T; contentIndex: number }
  | { type: "ad"; adIndex: number };

/** Split feed into content + ad segments (ad after every N cards) */
export function segmentFeedWithAds<T>(
  items: T[],
  interval = NATIVE_AD_INTERVAL
): FeedSegment<T>[] {
  const segments: FeedSegment<T>[] = [];
  let adIndex = 0;

  items.forEach((item, contentIndex) => {
    segments.push({ type: "content", item, contentIndex });
    const count = contentIndex + 1;
    if (count % interval === 0 && contentIndex < items.length - 1) {
      segments.push({ type: "ad", adIndex });
      adIndex += 1;
    }
  });

  return segments;
}
