"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { blurForCategory } from "@/lib/image-placeholder";
import { widthFromSizes } from "@/lib/images/homepage-sizes";
import {
  aspectClassName,
  imgPositionClass,
  normalizeMediaAspect,
  type MediaAspect,
  type ThumbAspect,
} from "@/lib/news/images/aspects";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { resolveMedia } from "@/lib/news/images/resolve-media";

type LoadTier = 0 | 1 | 2 | 3;

/** Default intrinsic size hints — avoid zero-height while CSS aspect classes apply */
export const MEDIA_IMAGE_DEFAULT_WIDTH = 720;
export const MEDIA_IMAGE_DEFAULT_HEIGHT = 405;

export type MediaImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  aspect?: ThumbAspect;
  /** CDN crop when `aspect` is `fill` (parent-sized box) */
  cropAspect?: ThumbAspect;
  category?: string;
  source?: string | null;
  articleUrl?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /** Extra scrim for text-on-image */
  cinematic?: boolean;
  /** Subtle bottom gradient only */
  subtleScrim?: boolean;
  /** Parent supplies aspect box (e.g. .feed-news-card__media) */
  fillParent?: boolean;
  /** Soft zoom on hover */
  hoverZoom?: boolean;
  /** Subtle frame shadow */
  shadow?: boolean;
  /** Optional intrinsic width hint (defaults avoid zero-height) */
  width?: number;
  /** Optional intrinsic height hint */
  height?: number;
};

function tierUrl(
  media: ReturnType<typeof resolveMedia>,
  tier: LoadTier
): string {
  switch (tier) {
    case 0:
      return media.optimizedUrl;
    case 1:
      return media.fallbackUrl;
    case 2:
      return media.placeholderUrl;
    default:
      return "";
  }
}

function cropAspectFor(
  aspectNorm: MediaAspect,
  cropAspectProp: ThumbAspect | undefined
): MediaAspect {
  if (aspectNorm !== "fill") return aspectNorm;
  const crop = normalizeMediaAspect(cropAspectProp);
  return crop === "fill" ? "16:9" : crop;
}

function NewspaperIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MediaImage({
  src,
  alt,
  sizes,
  aspect = "16:9",
  cropAspect: cropAspectProp,
  category,
  source,
  articleUrl,
  priority = false,
  className = "",
  imageClassName = "",
  cinematic = true,
  subtleScrim = false,
  fillParent = false,
  hoverZoom = true,
  shadow = true,
  width: widthProp,
  height: heightProp,
}: MediaImageProps) {
  const aspectNorm = normalizeMediaAspect(aspect);
  const cropAspect = cropAspectFor(aspectNorm, cropAspectProp);
  const width = widthProp ?? (widthFromSizes(sizes) || MEDIA_IMAGE_DEFAULT_WIDTH);
  const height = heightProp ?? MEDIA_IMAGE_DEFAULT_HEIGHT;
  const srcKey = `${src ?? ""}|${category ?? ""}|${source ?? ""}|${articleUrl ?? ""}|${cropAspect}`;

  const [tierState, setTierState] = useState<{
    key: string;
    tier: LoadTier;
    errors: number;
  }>({ key: srcKey, tier: 0, errors: 0 });
  const [loadedState, setLoadedState] = useState<{ key: string; loaded: boolean }>({
    key: srcKey,
    loaded: false,
  });

  const media = useMemo(() => {
    if (category) {
      return resolveMedia(
        {
          imageUrl: src,
          category,
          source,
          articleUrl,
        },
        cropAspect
      );
    }
    const url = src?.trim();
    if (!url) {
      return {
        url: "",
        optimizedUrl: "",
        fallbackUrl: "",
        placeholderUrl: "",
        isSynthetic: true,
        textOnly: true,
      };
    }
    const optimized = optimizeCdnUrl(url, {
      width,
      aspect: cropAspect,
      quality: priority ? 82 : 76,
    });
    return {
      url,
      optimizedUrl: optimized,
      fallbackUrl: optimized,
      placeholderUrl: optimized,
      isSynthetic: false,
      textOnly: false,
    };
  }, [src, category, source, articleUrl, cropAspect, width, priority]);

  const tier = tierState.key === srcKey ? tierState.tier : 0;
  const errors = tierState.key === srcKey ? tierState.errors : 0;
  const loaded = loadedState.key === srcKey ? loadedState.loaded : false;

  const displaySrc = media ? tierUrl(media, tier) : "";
  const showImage = Boolean(displaySrc) && tier < 3 && !media?.textOnly;
  const blurData = blurForCategory(category);
  const fallbackBg =
    tier >= 2 && media?.placeholderUrl ? media.placeholderUrl : undefined;

  const handleError = useCallback(() => {
    if (errors >= 3) {
      setTierState({ key: srcKey, tier: 3, errors: errors + 1 });
      return;
    }
    setLoadedState({ key: srcKey, loaded: false });
    setTierState((prev) => {
      const t = prev.key === srcKey ? prev.tier : 0;
      const nextErrors = (prev.key === srcKey ? prev.errors : 0) + 1;
      if (!media) return { key: srcKey, tier: 3, errors: nextErrors };
      if (t === 0) {
        if (media.placeholderUrl && media.placeholderUrl !== media.optimizedUrl) {
          return { key: srcKey, tier: 2, errors: nextErrors };
        }
        if (media.fallbackUrl && media.fallbackUrl !== media.optimizedUrl) {
          return { key: srcKey, tier: 1, errors: nextErrors };
        }
        return { key: srcKey, tier: 3, errors: nextErrors };
      }
      if (t === 1) {
        return {
          key: srcKey,
          tier:
            media.placeholderUrl && media.placeholderUrl !== media.fallbackUrl
              ? 2
              : 3,
          errors: nextErrors,
        };
      }
      return { key: srcKey, tier: 3, errors: nextErrors };
    });
  }, [media, srcKey, errors]);

  const handleLoad = useCallback(() => {
    setLoadedState({ key: srcKey, loaded: true });
  }, [srcKey]);

  const frameClass =
    fillParent || aspectNorm === "fill"
      ? "media-frame media-frame--fill"
      : `media-frame ${aspectClassName(aspectNorm)}`;

  const frameMods = [
    hoverZoom ? "media-frame--zoom" : "",
    shadow ? "media-frame--shadow" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const imgPosClass = imgPositionClass(cropAspect);
  const quality = priority ? 84 : 76;

  return (
    <div
      className={`${frameClass} ${frameMods} ${className}`.trim()}
      style={
        fillParent || aspectNorm === "fill"
          ? undefined
          : { minHeight: Math.max(1, Math.round(height * 0.25)) }
      }
      data-media-w={width}
      data-media-h={height}
    >
      <div className="media-frame__inner">
        {showImage ? (
          <>
            {!loaded ? (
              <span className="media-frame__skeleton" aria-hidden />
            ) : null}
            <Image
              key={displaySrc}
              src={displaySrc}
              alt={alt || "Editorial visual placeholder"}
              fill
              priority={priority}
              fetchPriority={priority ? "high" : "auto"}
              loading={priority ? undefined : "lazy"}
              decoding="async"
              placeholder="blur"
              blurDataURL={blurData}
              sizes={sizes}
              quality={quality}
              className={`media-frame__img ${imgPosClass} ${imageClassName} ${loaded ? "media-frame__img--loaded" : "media-frame__img--loading"}`.trim()}
              onLoad={handleLoad}
              onError={handleError}
            />
            {cinematic ? (
              <span
                className="media-frame__scrim media-frame__scrim--cinematic"
                aria-hidden
              />
            ) : subtleScrim ? (
              <span
                className="media-frame__scrim media-frame__scrim--subtle"
                aria-hidden
              />
            ) : (
              <span
                className="media-frame__scrim media-frame__scrim--contrast"
                aria-hidden
              />
            )}
          </>
        ) : (
          <div className="media-frame__fallback" aria-hidden>
            {fallbackBg ? (
              <span
                className="media-frame__fallback-bg"
                style={{ backgroundImage: `url(${fallbackBg})` }}
              />
            ) : null}
            <span className="media-frame__fallback-mark">
              {category ? (
                category.slice(0, 2).toUpperCase()
              ) : (
                <NewspaperIcon />
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
