"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { blurForCategory } from "@/lib/image-placeholder";
import { shouldUseNativeImage } from "@/lib/images/next-image-policy";
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
      return media.placeholderUrl || media.fallbackUrl || media.optimizedUrl;
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
  const [tier, setTier] = useState<LoadTier>(0);
  const [loaded, setLoaded] = useState(false);
  const [forceNative, setForceNative] = useState(false);
  const [failed, setFailed] = useState(false);

  const aspectNorm = normalizeMediaAspect(cropAspect);
  const crop = aspectNorm === "fill" ? "16:9" : aspectNorm;
  const width = widthFromSizes(sizes);

  const media = useMemo(() => {
    const resolvedCategory = category?.trim() || "news";
    if (category || src?.trim()) {
      return resolveMedia(
        { imageUrl: src, category: resolvedCategory, source, articleUrl },
        crop
      );
    }
    const url = src?.trim();
    if (!url) return null;
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
    };
  }, [src, category, source, articleUrl, crop, width, priority]);

  const displaySrc = media ? tierUrl(media, tier) : "";
  const showImage = Boolean(media && displaySrc && !failed);
  const blurData = blurForCategory(category);
  const preferNative = shouldUseNativeImage(media?.optimizedUrl);
  const handleError = useCallback(() => {
    setLoaded(false);
    setTier((t) => {
      if (!media) {
        setFailed(true);
        return 3;
      }
      if (t === 0) {
        if (media.fallbackUrl === media.optimizedUrl) {
          if (media.placeholderUrl === media.optimizedUrl) {
            setFailed(true);
            return 3;
          }
          return 2;
        }
        return 1;
      }
      if (t === 1) {
        if (media.placeholderUrl === media.fallbackUrl) {
          setFailed(true);
          return 3;
        }
        return 2;
      }
      setFailed(true);
      return 3;
    });
  }, [media]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  if (!showImage) {
    return (
      <div className={cn("jds-card-image jds-card-image--fallback", className)} aria-hidden>
        <span className="jds-card-image__fallback-mark">
          {(category ?? "news").slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  if (preferNative || forceNative) {
    return (
      <div className={cn("jds-card-image", className)}>
        {showSkeleton && !loaded ? (
          <Skeleton variant="media" className="jds-card-image__skeleton" aria-hidden />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={cn(
            "jds-card-image__img",
            loaded ? "jds-card-image__img--loaded" : "jds-card-image__img--loading"
          )}
          src={displaySrc || media?.url || src || ""}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          onError={handleError}
        />
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
        alt={alt}
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
        onError={() => {
          if (tier >= 2) {
            setForceNative(true);
          } else {
            handleError();
          }
        }}
      />
    </div>
  );
}

/** Alias — editorial card image is the canonical export name. */
export const EditorialCardImage = JdsCardImage;
