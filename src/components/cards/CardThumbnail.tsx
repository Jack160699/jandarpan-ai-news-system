"use client";

import { type ReactNode } from "react";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { normalizeMediaAspect, type ThumbAspect } from "@/lib/news/images/aspects";
import type { ThumbOverlay } from "@/components/cards/types";

type CardThumbnailProps = {
  src?: string | null;
  alt: string;
  aspect?: ThumbAspect;
  overlay?: ThumbOverlay;
  priority?: boolean;
  sizes: string;
  category?: string;
  source?: string | null;
  className?: string;
  imageClassName?: string;
  badges?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
};

function aspectClass(aspect: ThumbAspect): string {
  const n = normalizeMediaAspect(aspect);
  if (n === "fill") return "pcard-thumb--fill";
  return `pcard-thumb--${n.replace(":", "-")}`;
}

function overlayClass(overlay: ThumbOverlay): string | null {
  switch (overlay) {
    case "bottom":
      return "pcard-thumb__scrim--bottom";
    case "subtle":
      return "pcard-thumb__scrim--subtle";
    case "breaking":
      return "pcard-thumb__scrim--breaking";
    case "vignette":
      return "pcard-thumb__scrim--vignette";
    default:
      return null;
  }
}

/**
 * @deprecated Legacy premium card thumbnail — delegates image to design-system JdsCardImage.
 */
export function CardThumbnail({
  src,
  alt,
  aspect = "16:9",
  overlay = "none",
  priority = false,
  sizes,
  category,
  source,
  className = "",
  imageClassName = "pcard-thumb__img",
  badges,
  footer,
  children,
}: CardThumbnailProps) {
  const aspectNorm = normalizeMediaAspect(aspect);
  const cropAspect = aspectNorm === "fill" ? "16:9" : aspectNorm;
  const scrim = overlayClass(overlay);

  return (
    <div
      className={`pcard-thumb ${aspectClass(aspect)} ${className}`.trim()}
    >
      <div className="pcard-thumb__inner">
        <JdsCardImage
          src={src}
          alt={alt}
          sizes={sizes}
          priority={priority}
          category={category}
          source={source}
          cropAspect={cropAspect}
          className={`pcard-thumb__media ${imageClassName}`.trim()}
        />
        {scrim ? (
          <span className={`pcard-thumb__scrim ${scrim}`} aria-hidden />
        ) : null}
        {badges ? (
          <div className="pcard-thumb__badge-tl">{badges}</div>
        ) : null}
        {footer ? (
          <div className="pcard-thumb__badge-br">{footer}</div>
        ) : null}
        {children ? <div className="pcard-thumb__slot">{children}</div> : null}
      </div>
    </div>
  );
}
