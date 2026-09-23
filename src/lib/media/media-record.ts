/**
 * Canonical Media Record and Video Embed data models for Jan Darpan.
 * Strictly rights-aware and platform-compliant.
 */

export type EditorialMediaRightsStatus =
  | "owned"
  | "licensed"
  | "publisher_authorized"
  | "public_domain"
  | "creative_commons"
  | "official_embed"
  | "unknown"
  | "restricted";

export type EmbeddedVideo = {
  platform: "youtube" | "other";
  videoId: string;
  canonicalUrl: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  channel?: string | null;
  publishedAt?: string | null;
  embeddable?: boolean;
};

export type MediaRecord = {
  source_url?: string | null;
  media_url: string;
  media_type: "image" | "video";
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  source_domain?: string | null;
  source_article_url?: string | null;
  discovered_at: string;
  attribution_text?: string | null;
  rights_status: EditorialMediaRightsStatus;
  usage_method: "embed" | "rehost" | "direct_display" | "generated_fallback";
  license_or_permission_reference?: string | null;
  thumbnail_url?: string | null;
  caption?: string | null;
  provider?: string | null;
};

/**
 * Extract YouTube video ID from various URL patterns.
 * Supports: watch?v=, youtu.be/, embed/, shorts/
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match?.[1] ?? null;
}

/**
 * Build an EmbeddedVideo record from a YouTube URL.
 */
export function buildYouTubeEmbed(url: string, title?: string | null): EmbeddedVideo | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return {
    platform: "youtube",
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    title: title ?? null,
    embeddable: true,
  };
}

/**
 * Determine rights status based on source URL, publisher, and license signals.
 */
export function classifyMediaRights(
  sourceUrl: string,
  sourceName?: string | null,
  isExplicitPartner = false
): EditorialMediaRightsStatus {
  if (!sourceUrl) return "unknown";

  const lower = sourceUrl.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "official_embed";
  }

  if (lower.includes("wikimedia.org") || lower.includes("commons.wikimedia.org")) {
    return "creative_commons";
  }

  if (lower.includes("pib.gov.in") || lower.includes("archive.org")) {
    return "public_domain";
  }

  if (isExplicitPartner) {
    return "publisher_authorized";
  }

  return "unknown";
}
