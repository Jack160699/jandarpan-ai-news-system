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

/** Demo creatives — replace via placement config / API when available */
export function getNativeAdCreative(adIndex: number): NativeAdCreative {
  const kind = pickNativeAdKind(adIndex);
  const size = pickNativeAdSize(adIndex);

  const base = {
    size,
    targetUrl: "/archive",
    ctaLabel: "Learn more",
  };

  switch (kind) {
    case "regional":
      return {
        ...base,
        kind,
        sponsorName: "Chhattisgarh Business Desk",
        headline: "Support local shops in your district",
        description:
          "Discover trusted regional partners — curated for readers across Raipur, Bilaspur, and Durg.",
        ctaLabel: "Explore partners",
        imageUrl:
          "https://images.unsplash.com/photo-1577412647305-991150c7d163?w=800&q=80&auto=format&fit=crop",
      };
    case "video":
      return {
        ...base,
        kind,
        size: adIndex % 2 === 0 ? "full-width" : size,
        sponsorName: "Jan Darpan Video",
        headline: "60-second briefing: today's top CG headlines",
        description: "Watch a quick AI-narrated recap — built for mobile.",
        ctaLabel: "Watch now",
        targetUrl: "/shorts",
        videoPosterUrl:
          "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=960&q=80&auto=format&fit=crop",
      };
    case "carousel":
      return {
        ...base,
        kind,
        size: "full-width",
        sponsorName: "Partner carousel",
        headline: "Featured from our region",
        ctaLabel: "View offer",
        slides: [
          {
            id: "c1",
            title: "Raipur civic updates",
            subtitle: "City desk",
            targetUrl: "/category/raipur",
            imageUrl:
              "https://images.unsplash.com/photo-1587474260585-9bde22fbe946?w=640&q=80&auto=format&fit=crop",
          },
          {
            id: "c2",
            title: "Bhilai industry brief",
            subtitle: "Business",
            targetUrl: "/category/business",
            imageUrl:
              "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=640&q=80&auto=format&fit=crop",
          },
          {
            id: "c3",
            title: "Bastar heritage week",
            subtitle: "Culture",
            targetUrl: "/category/chhattisgarh",
            imageUrl:
              "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640&q=80&auto=format&fit=crop",
          },
        ],
      };
    case "sponsored":
    default:
      return {
        ...base,
        kind: "sponsored",
        sponsorName: "State Partner",
        headline: "Premium regional coverage for Chhattisgarh",
        description:
          "Clear, trustworthy reporting for Chhattisgarh — with transparent sponsorship labels.",
        ctaLabel: "See partnership",
        imageUrl:
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80&auto=format&fit=crop",
      };
  }
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
