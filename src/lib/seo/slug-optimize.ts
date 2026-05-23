/**
 * SEO slug optimization — canonical paths, uniqueness, headline alignment
 */

import {
  buildArticleSlug,
  ensureUniqueSlug,
  slugifyTitle,
  storyPath,
} from "@/lib/news/slug";

const SLUG_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "of",
  "for",
  "and",
  "with",
  "from",
  "by",
  "is",
  "are",
  "was",
  "were",
  "की",
  "के",
  "में",
  "से",
  "पर",
  "और",
  "का",
  "की",
]);

/** Trim filler words for shorter, keyword-rich slugs */
export function optimizeSlugBase(title: string): string {
  const raw = slugifyTitle(title);
  const parts = raw.split("-").filter((p) => p && !SLUG_STOPWORDS.has(p));
  const trimmed = parts.join("-");
  return trimmed.length >= 4 ? trimmed.slice(0, 56) : raw;
}

/**
 * Preferred slug for generated articles — stable id suffix, SEO-trimmed base.
 */
export function optimizeSeoSlug(
  headline: string,
  articleId: string,
  used?: Set<string>
): string {
  const base = optimizeSlugBase(headline);
  const idSuffix = articleId.replace(/-/g, "").slice(0, 8);
  const candidate = `${base}-${idSuffix}`.replace(/-+/g, "-").slice(0, 96);

  if (!used) return candidate;
  return ensureUniqueSlug(candidate, used);
}

export function canonicalStoryPath(slug: string): string {
  return storyPath(encodeURIComponent(slug));
}

export function shouldRedirectToCanonicalSlug(
  requestedSlug: string,
  canonicalSlug: string
): boolean {
  if (!canonicalSlug || !requestedSlug) return false;
  return (
    decodeURIComponent(requestedSlug).toLowerCase() !==
    canonicalSlug.toLowerCase()
  );
}

export { buildArticleSlug, ensureUniqueSlug, slugifyTitle, storyPath };
