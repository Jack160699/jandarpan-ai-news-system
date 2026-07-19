import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { ArticleVariant } from "./types";

const OPINION_RE = /opinion|op-ed|राय|ओपिनियन|viewpoint|column/i;
const EDITORIAL_RE = /editorial|संपादकीय|editor(?:ial)?\s*board|संपादक/i;
const EXPLAINER_RE = /explainer|समझिए|explain|faq|q\s*&\s*a|सवाल/i;
const PHOTO_RE = /photo\s*story|gallery|फ़ोटो|फोटो\s*स्टोरी|pictorial/i;
const VIDEO_RE = /video|वीडियो|watch|shorts/i;

function tagBlob(tags: string[] | null | undefined, category?: string | null): string {
  return [...(tags ?? []), category ?? ""].join(" ");
}

function hasRealImage(
  imageUrl: string | null | undefined,
  editorialMeta?: EditorialMetadata | null
): boolean {
  const url = (
    imageUrl ||
    editorialMeta?.image?.hero_url ||
    editorialMeta?.image?.og_url ||
    ""
  ).trim();
  if (!url) return false;
  // Synthetic/placeholder CDN markers used by the media pipeline
  if (/placeholder|synth|default-hero|no[-_]?image/i.test(url)) return false;
  return true;
}

function isBreakingMeta(
  editorialMeta?: EditorialMetadata | null,
  generatedRow?: GeneratedArticleRow | null
): boolean {
  if (editorialMeta?.is_breaking) return true;
  if (editorialMeta?.breaking_override) return true;
  const score =
    editorialMeta?.breaking_score ?? editorialMeta?.quality_breakdown?.breaking_score;
  if (typeof score === "number" && score >= 0.75) return true;
  void generatedRow;
  return false;
}

function aspectLooksPhoto(editorialMeta?: EditorialMetadata | null): boolean {
  const w = editorialMeta?.image?.width;
  const h = editorialMeta?.image?.height;
  if (!w || !h || w <= 0 || h <= 0) return false;
  const ratio = w / h;
  // Near 4:5 portrait
  return ratio >= 0.7 && ratio <= 0.9;
}

function hasVideoSignal(
  tags: string[],
  editorialMeta?: EditorialMetadata | null,
  generatedRow?: GeneratedArticleRow | null
): boolean {
  const blob = tagBlob(tags);
  if (VIDEO_RE.test(blob)) return true;
  if (editorialMeta?.shorts) return true;
  if (generatedRow?.shorts_metadata) return true;
  return false;
}

export type ResolveVariantInput = {
  tags?: string[] | null;
  category?: string | null;
  imageUrl?: string | null;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
  sponsored?: SponsoredStoryMeta | null;
  takeawayCount?: number;
  /** Force premium presentation (member /premium route). */
  forcePremium?: boolean;
  /** Force live-blog presentation (/live/[slug]). */
  forceLiveBlog?: boolean;
};

/**
 * Priority: live-blog → premium → sponsored → breaking → video → photo
 * → explainer → opinion → editorial → no-image → standard.
 */
export function resolveArticleVariant(input: ResolveVariantInput): ArticleVariant {
  if (input.forceLiveBlog) return "live-blog";
  if (input.forcePremium) return "premium";
  if (input.sponsored) return "sponsored";

  const tags = input.tags ?? [];
  const blob = tagBlob(tags, input.category);
  const meta = input.editorialMeta;

  if (isBreakingMeta(meta, input.generatedRow)) return "breaking";
  if (hasVideoSignal(tags, meta, input.generatedRow)) return "video";
  if (PHOTO_RE.test(blob) || aspectLooksPhoto(meta)) return "photo";
  if (EXPLAINER_RE.test(blob) || (input.takeawayCount ?? 0) >= 3) return "explainer";
  if (OPINION_RE.test(blob)) return "opinion";
  if (EDITORIAL_RE.test(blob)) return "editorial";
  if (!hasRealImage(input.imageUrl, meta)) return "no-image";
  return "standard";
}
