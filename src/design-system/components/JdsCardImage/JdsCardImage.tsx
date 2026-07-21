"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { blurForCategory } from "@/lib/image-placeholder";
import { widthFromSizes } from "@/lib/images/homepage-sizes";
import {
  normalizeMediaAspect,
  type ThumbAspect,
} from "@/lib/news/images/aspects";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { resolveMedia } from "@/lib/news/images/resolve-media";
import { cn } from "@/design-system/utils/cn";
import { Skeleton } from "../Skeleton";

type LoadTier = 0 | 1 | 2 | 3;

export type JdsCardImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  category?: string;
  source?: string | null;
  articleUrl?: string;
  cropAspect?: ThumbAspect;
  showSkeleton?: boolean;
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

/**
 * Canonical editorial card image — Next/Image, lazy loading, skeleton, CDN fallback.
 * Single image primitive for all editorial surfaces.
 */
export function JdsCardImage({
  src,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 24rem",
  category,
  source,
  articleUrl,
  cropAspect = "16:9",
  showSkeleton = true,
}: JdsCardImageProps) {
  const aspectNorm = normalizeMediaAspect(cropAspect);
  const crop = aspectNorm === "fill" ? "16:9" : aspectNorm;
  const width = widthFromSizes(sizes);
  const srcKey = `${src ?? ""}|${category ?? ""}|${source ?? ""}|${articleUrl ?? ""}|${crop}`;

  const media = useMemo(() => {
    if (category) {
      return resolveMedia(
        { imageUrl: src, category, source, articleUrl },
        crop
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
      aspect: crop,
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
  }, [src, category, source, articleUrl, crop, width, priority]);

  const [tierState, setTierState] = useState<{
    key: string;
    tier: LoadTier;
    errors: number;
  }>({ key: srcKey, tier: 0, errors: 0 });
  const [loadedState, setLoadedState] = useState<{ key: string; loaded: boolean }>({
    key: srcKey,
    loaded: false,
  });

  const tier = tierState.key === srcKey ? tierState.tier : 0;
  const errors = tierState.key === srcKey ? tierState.errors : 0;
  const loaded = loadedState.key === srcKey ? loadedState.loaded : false;

  const displaySrc = media ? tierUrl(media, tier) : "";
  const textOnly = Boolean(media?.textOnly) || (!displaySrc && tier >= 3);
  const showImage = Boolean(displaySrc) && tier < 3 && !textOnly;
  const blurData = blurForCategory(category);

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
        if (media.fallbackUrl && media.fallbackUrl !== media.optimizedUrl) {
          return { key: srcKey, tier: 1, errors: nextErrors };
        }
        if (media.placeholderUrl && media.placeholderUrl !== media.optimizedUrl) {
          return { key: srcKey, tier: 2, errors: nextErrors };
        }
        return { key: srcKey, tier: 3, errors: nextErrors };
      }
      if (t === 1) {
        if (media.placeholderUrl && media.placeholderUrl !== media.fallbackUrl) {
          return { key: srcKey, tier: 2, errors: nextErrors };
        }
        return { key: srcKey, tier: 3, errors: nextErrors };
      }
      return { key: srcKey, tier: 3, errors: nextErrors };
    });
  }, [media, srcKey, errors]);

  const handleLoad = useCallback(() => {
    setLoadedState({ key: srcKey, loaded: true });
  }, [srcKey]);

  if (!showImage) {
    return (
      <div
        className={cn("jds-card-image jds-card-image--fallback", className)}
        role="img"
        aria-label={alt || "Editorial visual placeholder"}
        data-text-only="1"
      >
        <span className="jds-card-image__fallback-mark" aria-hidden>
          {category ? category.slice(0, 2).toUpperCase() : "JD"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("jds-card-image", className)}>
      {showSkeleton && !loaded ? (
        <Skeleton variant="media" className="jds-card-image__skeleton" aria-hidden />
      ) : null}
      <Image
        key={displaySrc}
        src={displaySrc}
        alt={alt || "Editorial visual placeholder"}
        fill
        sizes={sizes}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? undefined : "lazy"}
        decoding="async"
        placeholder="blur"
        blurDataURL={blurData}
        quality={priority ? 84 : 76}
        className={cn(
          "jds-card-image__img",
          loaded ? "jds-card-image__img--loaded" : "jds-card-image__img--loading"
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/** Alias — editorial card image is the canonical export name. */
export const EditorialCardImage = JdsCardImage;
