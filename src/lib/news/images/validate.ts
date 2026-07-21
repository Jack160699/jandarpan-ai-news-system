/**
 * Image URL validation & quality scoring
 */

import { isValidHttpUrl } from "@/lib/news/normalize";
import {
  isExpiredSignedUrl,
  isSupabaseSignedUrl,
} from "@/lib/news/images/trusted-remote-hosts";

export type ImageCandidateSource =
  | "og"
  | "twitter"
  | "rss_media"
  | "enclosure"
  | "html_img"
  | "provider"
  | "fallback";

export type ImageCandidate = {
  url: string;
  source: ImageCandidateSource;
  width?: number;
  height?: number;
};

const PLACEHOLDER_RE =
  /placeholder|placehold\.co|via\.placeholder|default\.(jpg|png|gif)|no-?image|1x1|pixel\.|spacer\.|blank\.|dummy|data:image|about:blank/i;

/** Hard-coded URLs that consistently 404 — skip before Next/Image fetch. */
const KNOWN_BROKEN_IMAGE_RE =
  /photo-1529107386315-e1a269ed48e0/i;

const LOGO_ICON_RE =
  /\/(logo|icon|favicon|avatar|badge|sprite|emoji|button|banner-ad|ads?|advert|promo-thumb|brand-mark|app-icon|apple-touch)[\/._-]|logo\.|icon\.|favicon\.|\.svg(\?|$)|sprite|avatar-|profile-pic|apple-touch-icon/i;

/** Jan Darpan brand / OG / social lockups must never be editorial story media. */
const BRAND_ASSET_RE =
  /\/brand\/|jan-darpan[-_](chhattisgarh[-_])?(logo|mark|og|icon)|jandarpan[-_](logo|mark|og)|social[-_]?lockup|transparency[-_]?preview|checkerboard|checkered[-_]?bg|alpha[-_]?preview/i;

const TRACKING_PIXEL_RE =
  /\/(pixel|beacon|track|analytics|collect)[\/._-]|1x1\.(gif|png|jpg)|spacer\.(gif|png)|tracking[-_]?pixel/i;

const AD_RE =
  /\/ad[sx]?[\/._-]|doubleclick|googlesyndication|adserver|taboola|outbrain|sponsored/i;

const MIN_WIDTH = 320;
const MIN_HEIGHT = 180;
const MIN_ASPECT = 0.45;
const MAX_ASPECT = 2.4;

export function parseDimensionsFromUrl(url: string): { width?: number; height?: number } {
  try {
    const u = new URL(url);
    const w =
      Number(u.searchParams.get("w")) ||
      Number(u.searchParams.get("width")) ||
      Number(u.searchParams.get("imwidth"));
    const h =
      Number(u.searchParams.get("h")) ||
      Number(u.searchParams.get("height")) ||
      Number(u.searchParams.get("imheight"));
    const dims = url.match(/(\d{3,4})x(\d{3,4})/);
    return {
      width: w || (dims ? Number(dims[1]) : undefined),
      height: h || (dims ? Number(dims[2]) : undefined),
    };
  } catch {
    return {};
  }
}

export function isRejectedImageUrl(url: string): { rejected: boolean; reason?: string } {
  if (!url?.trim()) {
    return { rejected: true, reason: "invalid_url" };
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("data:")) {
    return { rejected: true, reason: "data_uri" };
  }

  if (!isValidHttpUrl(trimmed)) {
    return { rejected: true, reason: "invalid_url" };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:") {
      return { rejected: true, reason: "http_not_https" };
    }
  } catch {
    return { rejected: true, reason: "malformed_url" };
  }

  if (PLACEHOLDER_RE.test(lower)) {
    return { rejected: true, reason: "placeholder" };
  }

  if (KNOWN_BROKEN_IMAGE_RE.test(lower)) {
    return { rejected: true, reason: "known_broken" };
  }

  if (BRAND_ASSET_RE.test(lower)) {
    return { rejected: true, reason: "brand_asset" };
  }

  if (LOGO_ICON_RE.test(lower)) {
    return { rejected: true, reason: "logo_or_icon" };
  }

  if (TRACKING_PIXEL_RE.test(lower)) {
    return { rejected: true, reason: "tracking_pixel" };
  }

  if (AD_RE.test(lower)) {
    return { rejected: true, reason: "advertisement" };
  }

  if (isSupabaseSignedUrl(trimmed) && isExpiredSignedUrl(trimmed)) {
    return { rejected: true, reason: "expired_signed_url" };
  }

  const { width, height } = parseDimensionsFromUrl(trimmed);
  if (width && width < MIN_WIDTH) {
    return { rejected: true, reason: "too_narrow" };
  }
  if (height && height < MIN_HEIGHT) {
    return { rejected: true, reason: "too_short" };
  }
  if (width && height) {
    const aspect = width / height;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
      return { rejected: true, reason: "bad_aspect" };
    }
  }

  return { rejected: false };
}

/** 0–100 editorial suitability score */
export function imageQualityScore(candidate: ImageCandidate): number {
  const { rejected, reason } = isRejectedImageUrl(candidate.url);
  if (rejected) return 0;

  let score = 40;

  const sourceBoost: Record<ImageCandidateSource, number> = {
    og: 28,
    twitter: 24,
    provider: 22,
    rss_media: 20,
    enclosure: 18,
    html_img: 12,
    fallback: 5,
  };
  score += sourceBoost[candidate.source] ?? 10;

  const { width, height } = {
    ...parseDimensionsFromUrl(candidate.url),
    width: candidate.width,
    height: candidate.height,
  };

  if (width && height) {
    const px = width * height;
    if (px >= 640 * 360) score += 18;
    else if (px >= 480 * 270) score += 12;
    else if (px >= MIN_WIDTH * MIN_HEIGHT) score += 6;

    const aspect = width / height;
    if (aspect >= 1.2 && aspect <= 1.9) score += 8;
  } else if (/\.(jpe?g|png|webp)(\?|$)/i.test(candidate.url)) {
    score += 6;
  }

  if (/\/(photo|image|img|gallery|featured|hero|thumb|media|uploads|wp-content)\//i.test(
    candidate.url
  )) {
    score += 5;
  }

  if (reason) score -= 10;

  return Math.min(100, Math.max(0, score));
}

export function isDisplayableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return !isRejectedImageUrl(url).rejected;
}
