/**
 * Terminal editorial image sources — queue cleanup and completion gates.
 */

export const TERMINAL_EDITORIAL_IMAGE_SOURCES = [
  "ai_generated",
  "duplicate_reuse",
  "duplicate_visual_reuse",
  "repaired",
  "region_curated",
  "category_curated",
  "text_only",
  "source_extracted",
  "manual_replace",
] as const;

export type TerminalEditorialImageSource =
  (typeof TERMINAL_EDITORIAL_IMAGE_SOURCES)[number];

/** Sources that count as successful AI / reuse — not stock fallbacks */
export const AI_SUCCESS_IMAGE_SOURCES = [
  "ai_generated",
  "duplicate_reuse",
  "duplicate_visual_reuse",
  "repaired",
] as const;

export function isTerminalEditorialImageSource(
  source: string | null | undefined
): source is TerminalEditorialImageSource {
  if (!source) return false;
  return (TERMINAL_EDITORIAL_IMAGE_SOURCES as readonly string[]).includes(source);
}

export function isAiSuccessImageSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return (AI_SUCCESS_IMAGE_SOURCES as readonly string[]).includes(source);
}

/**
 * When AI generation was requested (decision B), curated stock is NOT a
 * successful AI completion — allow bounded retries before accepting fallback.
 */
export function isAcceptableCompletionWhenAiExpected(
  source: string | null | undefined
): boolean {
  return isAiSuccessImageSource(source);
}

export function getEditorialImageMeta(
  editorialMetadata: unknown
): {
  source?: string;
  status?: string;
  decision?: string;
  decision_reason?: string;
} {
  const meta = editorialMetadata as {
    image?: {
      source?: string;
      status?: string;
      decision?: string;
      decision_reason?: string;
    };
  } | null;
  return meta?.image ?? {};
}

export function hasAiEditorialHero(article: {
  hero_image_url?: string | null;
  editorial_metadata?: unknown;
}): boolean {
  const { source } = getEditorialImageMeta(article.editorial_metadata);
  if (isAiSuccessImageSource(source)) {
    return true;
  }
  const url = article.hero_image_url ?? "";
  return url.includes("editorial-images") || url.includes("/storage/v1/object/public/editorial");
}

export function isTextOnlyEditorialImage(article: {
  hero_image_url?: string | null;
  editorial_metadata?: unknown;
}): boolean {
  const { source } = getEditorialImageMeta(article.editorial_metadata);
  return source === "text_only" || (!article.hero_image_url && source === "text_only");
}

/** Generic / stock Unsplash-style heroes that may need backfill */
export function looksLikeGenericStockHero(url: string | null | undefined): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.includes("images.unsplash.com") ||
    u.includes("plus.unsplash.com") ||
    u.includes("source.unsplash.com") ||
    u.includes("placeholder") ||
    u.includes("picsum.photos")
  );
}
