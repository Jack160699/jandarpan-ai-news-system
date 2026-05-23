"use client";

import { type ReactNode } from "react";
import { MediaImage } from "@/components/media/MediaImage";
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
  const fillParent = aspectNorm === "fill";
  const scrim = overlayClass(overlay);
  const useCardScrim = overlay !== "none";

  return (
    <div
      className={`pcard-thumb ${aspectClass(aspect)} ${className}`.trim()}
    >
      <div className="pcard-thumb__inner">
        <MediaImage
          src={src}
          alt={alt}
          aspect={aspect}
          sizes={sizes}
          priority={priority}
          category={category}
          source={source}
          fillParent={fillParent}
          cinematic={!useCardScrim}
          imageClassName={imageClassName}
          className="pcard-thumb__media"
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
