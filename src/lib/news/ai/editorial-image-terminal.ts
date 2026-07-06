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
] as const;

export type TerminalEditorialImageSource =
  (typeof TERMINAL_EDITORIAL_IMAGE_SOURCES)[number];

export function isTerminalEditorialImageSource(
  source: string | null | undefined
): source is TerminalEditorialImageSource {
  if (!source) return false;
  return (TERMINAL_EDITORIAL_IMAGE_SOURCES as readonly string[]).includes(source);
}

export function getEditorialImageMeta(
  editorialMetadata: unknown
): { source?: string; status?: string } {
  const meta = editorialMetadata as { image?: { source?: string; status?: string } } | null;
  return meta?.image ?? {};
}

export function hasAiEditorialHero(article: {
  hero_image_url?: string | null;
  editorial_metadata?: unknown;
}): boolean {
  const { source } = getEditorialImageMeta(article.editorial_metadata);
  if (
    source === "ai_generated" ||
    source === "repaired" ||
    source === "duplicate_reuse" ||
    source === "duplicate_visual_reuse"
  ) {
    return true;
  }
  const url = article.hero_image_url ?? "";
  return url.includes("editorial-images") || url.includes("/storage/v1/object/public/editorial");
}
