/**
 * Centralized editorial image resolver for cards / heroes / feed.
 *
 * Fallback order:
 * 1. valid story-specific editorial image (AI/storage hero)
 * 2. permitted relevant source image
 * 3. valid generated / OG / body editorial image
 * 4. category-specific curated fallback
 * 5. clean text-only card (no fabricated event imagery)
 */

import { resolveContextualFallback } from "@/lib/news/images/editorial-visual-fallbacks";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { validateImageUrlShape } from "@/lib/news/images/image-url-validation";
import {
  isTrustedImageUrl,
  isExpiredSignedUrl,
} from "@/lib/news/images/trusted-remote-hosts";
import { isRejectedImageUrl } from "@/lib/news/images/validate";
import { hasAiEditorialHero } from "@/lib/news/ai/editorial-image-terminal";
import type { MediaAspect } from "@/lib/news/images/aspects";

export type EditorialImageTier =
  | "story_editorial"
  | "source_image"
  | "generated_editorial"
  | "category_fallback"
  | "text_only";

export type EditorialImageResolveInput = {
  heroUrl?: string | null;
  ogUrl?: string | null;
  bodyImageUrl?: string | null;
  sourceImageUrl?: string | null;
  title?: string | null;
  category?: string | null;
  region?: string | null;
  source?: string | null;
  alt?: string | null;
  /** When true, metadata indicates AI/storage hero */
  editorialMetadata?: unknown;
  aspect?: MediaAspect;
  width?: number;
};

export type EditorialImageResolveResult = {
  /** Null when text-only — consumers must not render a broken img */
  url: string | null;
  optimizedUrl: string | null;
  /** Next runtime fallback URL (category curated), or null for text-only */
  fallbackUrl: string | null;
  tier: EditorialImageTier;
  isSynthetic: boolean;
  textOnly: boolean;
  /** Safe alt — never invents photo credit when image context unknown */
  alt: string;
  rejectReason?: string;
};

function candidateOk(url: string | null | undefined): {
  ok: boolean;
  reason?: string;
  url?: string;
} {
  if (!url?.trim()) return { ok: false, reason: "missing" };
  const trimmed = url.trim();
  const shape = validateImageUrlShape(trimmed);
  if (!shape.ok) return { ok: false, reason: shape.reason };
  if (isExpiredSignedUrl(trimmed)) {
    return { ok: false, reason: "expired_signed_url" };
  }
  const rejected = isRejectedImageUrl(trimmed);
  if (rejected.rejected) return { ok: false, reason: rejected.reason };
  return { ok: true, url: trimmed };
}

function buildAlt(input: EditorialImageResolveInput, tier: EditorialImageTier): string {
  if (input.alt?.trim()) return input.alt.trim().slice(0, 120);
  if (tier === "text_only" || tier === "category_fallback") {
    return "Editorial visual placeholder";
  }
  if (input.title?.trim()) {
    return `Illustration related to: ${String(input.title).slice(0, 100)}`;
  }
  return "Jan Darpan news image";
}

function optimize(
  url: string,
  aspect: MediaAspect = "16:9",
  width = 720
): string {
  return optimizeCdnUrl(url, {
    aspect: aspect === "fill" ? "16:9" : aspect,
    width,
  });
}

/**
 * Resolve a displayable editorial image with safe rejection + fallbacks.
 * Does not fabricate real-event photography.
 */
export function resolveEditorialImage(
  input: EditorialImageResolveInput
): EditorialImageResolveResult {
  const aspect = input.aspect ?? "16:9";
  const width = input.width ?? 720;
  const category = input.category ?? "general";

  const storyEditorial =
    candidateOk(input.heroUrl).ok &&
    hasAiEditorialHero({
      hero_image_url: input.heroUrl,
      editorial_metadata: input.editorialMetadata,
    })
      ? candidateOk(input.heroUrl)
      : { ok: false as const, reason: "not_story_editorial" };

  if (storyEditorial.ok && storyEditorial.url) {
    return {
      url: storyEditorial.url,
      optimizedUrl: optimize(storyEditorial.url, aspect, width),
      fallbackUrl: null,
      tier: "story_editorial",
      isSynthetic: false,
      textOnly: false,
      alt: buildAlt(input, "story_editorial"),
    };
  }

  const source = candidateOk(input.sourceImageUrl);
  if (source.ok && source.url && isTrustedImageUrl(source.url)) {
    const categoryFb = resolveContextualFallback({
      category,
      region: input.region,
      source: input.source,
    }).url;
    return {
      url: source.url,
      optimizedUrl: optimize(source.url, aspect, width),
      fallbackUrl: optimize(categoryFb, aspect, width),
      tier: "source_image",
      isSynthetic: false,
      textOnly: false,
      alt: buildAlt(input, "source_image"),
    };
  }

  const generatedCandidates = [
    input.heroUrl,
    input.ogUrl,
    input.bodyImageUrl,
  ];
  for (const raw of generatedCandidates) {
    const c = candidateOk(raw);
    if (c.ok && c.url) {
      const categoryFb = resolveContextualFallback({
        category,
        region: input.region,
        source: input.source,
      }).url;
      // Avoid using the same rejected brand/stock URL as both primary and fallback
      const fb =
        candidateOk(categoryFb).ok && categoryFb !== c.url
          ? optimize(categoryFb, aspect, width)
          : null;
      return {
        url: c.url,
        optimizedUrl: optimize(c.url, aspect, width),
        fallbackUrl: fb,
        tier: "generated_editorial",
        isSynthetic: false,
        textOnly: false,
        alt: buildAlt(input, "generated_editorial"),
        rejectReason: storyEditorial.reason,
      };
    }
  }

  const contextual = resolveContextualFallback({
    category,
    region: input.region,
    source: input.source,
  });
  const ctxOk = candidateOk(contextual.url);
  if (ctxOk.ok && ctxOk.url) {
    return {
      url: ctxOk.url,
      optimizedUrl: optimize(ctxOk.url, aspect, width),
      fallbackUrl: null,
      tier: "category_fallback",
      isSynthetic: true,
      textOnly: false,
      alt: buildAlt(input, "category_fallback"),
    };
  }

  return {
    url: null,
    optimizedUrl: null,
    fallbackUrl: null,
    tier: "text_only",
    isSynthetic: true,
    textOnly: true,
    alt: buildAlt(input, "text_only"),
    rejectReason:
      source.reason ||
      candidateOk(input.heroUrl).reason ||
      "no_safe_image",
  };
}

/** Runtime load failure helper — advance through fallback then text-only. */
export function nextEditorialImageOnError(
  current: EditorialImageResolveResult
): EditorialImageResolveResult {
  if (current.fallbackUrl && current.fallbackUrl !== current.optimizedUrl) {
    return {
      ...current,
      url: current.fallbackUrl,
      optimizedUrl: current.fallbackUrl,
      fallbackUrl: null,
      tier: "category_fallback",
      isSynthetic: true,
      textOnly: false,
      alt: buildAlt({}, "category_fallback"),
    };
  }
  return {
    url: null,
    optimizedUrl: null,
    fallbackUrl: null,
    tier: "text_only",
    isSynthetic: true,
    textOnly: true,
    alt: "Editorial visual placeholder",
  };
}
