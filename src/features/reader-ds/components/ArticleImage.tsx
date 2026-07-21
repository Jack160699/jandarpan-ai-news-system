"use client";

import { useEffect, useMemo, useState } from "react";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import {
  nextEditorialImageOnError,
  resolveEditorialImage,
  type EditorialImageResolveResult,
} from "@/lib/news/images/editorial-image-resolver";
import { isDisplayableImage } from "@/lib/news/images/validate";

export type JdImageRatio = "lead" | "video" | "thumb" | "photo" | "square";

/** Approved lead height (A1); thumbs match secondary-story 96×72. */
const FIXED_H: Partial<Record<JdImageRatio, number>> = {
  lead: 190,
  thumb: 72,
};

const RATIO: Record<JdImageRatio, string> = {
  lead: "3 / 2",
  video: "16 / 9",
  thumb: "4 / 3",
  photo: "4 / 5",
  square: "1 / 1",
};

const CDN_ASPECT: Record<JdImageRatio, "16:9" | "4:3" | "1:1" | "4:5"> = {
  lead: "4:3",
  video: "16:9",
  thumb: "4:3",
  photo: "4:5",
  square: "1:1",
};

const WIDTH: Record<JdImageRatio, number> = {
  lead: 720,
  video: 640,
  thumb: 200,
  photo: 500,
  square: 200,
};

/** Design-faithful tinted scene fallbacks (city / field / market…). */
const TONES: Record<string, [string, string]> = {
  city: ["#2c3e5c", "#4a5f80"],
  field: ["#2f4a35", "#4d6b52"],
  market: ["#5c4a2c", "#8a7145"],
  sport: ["#2c4a5c", "#457185"],
  court: ["#3d3a4a", "#5a5670"],
  portrait: ["#4a3f3a", "#6b5c52"],
  night: ["#1a2438", "#2c3a55"],
  festival: ["#4a2c3e", "#7a4a5c"],
};

type ArticleImageProps = {
  src?: string | null;
  alt: string;
  ratio?: JdImageRatio;
  caption?: string | null;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Scene tone for missing-image editorial fallback */
  tone?: keyof typeof TONES | string;
  category?: string | null;
  source?: string | null;
  region?: string | null;
  /**
   * When true, alt is treated as a known photo description.
   * When false/unknown, prefer neutral placeholder alt on synthetic frames.
   */
  altIsPhotoDescription?: boolean;
};

/**
 * Reader-DS image — reserved aspect, CDN crop, tiered fallback, then text-only.
 * Never shows a broken-image icon; never infinite-retries.
 */
export function ArticleImage({
  src,
  alt,
  ratio = "lead",
  caption,
  className,
  priority = false,
  sizes,
  tone = "city",
  category = "general",
  source,
  region,
  altIsPhotoDescription = false,
}: ArticleImageProps) {
  const srcKey = src ?? "";
  const base = useMemo(
    () =>
      resolveEditorialImage({
        heroUrl: src && isDisplayableImage(src) ? src : null,
        sourceImageUrl: src && isDisplayableImage(src) ? src : null,
        category: category ?? "general",
        source,
        region,
        alt: altIsPhotoDescription ? alt : undefined,
        title: altIsPhotoDescription ? undefined : alt,
        aspect: CDN_ASPECT[ratio],
        width: WIDTH[ratio],
      }),
    [src, category, source, region, ratio, alt, altIsPhotoDescription]
  );

  const [runtime, setRuntime] = useState<{
    key: string;
    display: EditorialImageResolveResult;
    errors: number;
  } | null>(null);
  const [forceLoad, setForceLoad] = useState(false);
  const [forceKey, setForceKey] = useState(srcKey);
  const [dataSaving, setDataSaving] = useState(false);

  const display =
    runtime && runtime.key === srcKey ? runtime.display : base;
  const errorCount = runtime && runtime.key === srcKey ? runtime.errors : 0;
  const forceLoadActive = forceKey === srcKey && forceLoad;
  useEffect(() => {
    const read = () =>
      setDataSaving(document.documentElement.getAttribute("data-data-saving") === "1");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-data-saving"],
    });
    return () => obs.disconnect();
  }, []);

  const blocked = dataSaving && !forceLoadActive && Boolean(display.optimizedUrl);
  const textOnly = display.textOnly || !display.optimizedUrl;
  const hasImage = !textOnly && !blocked;
  const optimized = hasImage
    ? optimizeCdnUrl(display.optimizedUrl!, {
        width: WIDTH[ratio],
        aspect: CDN_ASPECT[ratio],
        quality: priority ? 82 : 74,
      })
    : "";

  const fixedH = FIXED_H[ratio];
  const [c0, c1] = TONES[tone] ?? TONES.city;
  const safeAlt = display.alt || (altIsPhotoDescription ? alt : "Editorial visual placeholder");

  const handleError = () => {
    if (errorCount >= 2) {
      setRuntime({
        key: srcKey,
        errors: errorCount + 1,
        display: {
          ...display,
          url: null,
          optimizedUrl: null,
          fallbackUrl: null,
          textOnly: true,
          tier: "text_only",
        },
      });
      return;
    }
    setRuntime({
      key: srcKey,
      errors: errorCount + 1,
      display: nextEditorialImageOnError(display),
    });
  };
  return (
    <figure
      className={`jd-img${className ? ` ${className}` : ""}${textOnly ? " jd-img--text-only" : ""}`}
      style={{
        position: "relative",
        height: fixedH,
        aspectRatio: fixedH ? undefined : RATIO[ratio],
        overflow: "hidden",
        borderRadius: "var(--jd-radius)",
        margin: 0,
        background: `linear-gradient(135deg, ${c0}, ${c1})`,
      }}
      data-image-tier={display.tier}
      data-text-only={textOnly ? "1" : "0"}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 2px, transparent 2px 22px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="jd-img-media"
          src={optimized}
          alt={safeAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          sizes={sizes}
          onError={handleError}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      ) : null}

      {textOnly && !blocked ? (
        <span
          aria-hidden
          className="jd-ui"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,.72)",
            fontSize: ratio === "thumb" ? 10 : 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {category ? String(category).slice(0, 2) : "JD"}
        </span>
      ) : null}

      {blocked ? (
        <button
          type="button"
          onClick={() => {
            setForceKey(srcKey);
            setForceLoad(true);
          }}
          className="jd-ui"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,.9)",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          इमेज लोड करें
        </button>
      ) : null}

      {caption ? (
        <figcaption
          className="jd-ui"
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            zIndex: 2,
            fontFamily: "ui-monospace, monospace",
            fontSize: 9,
            color: "rgba(255,255,255,.82)",
            background: "rgba(0,0,0,.4)",
            padding: "2px 7px",
            borderRadius: 2,
          }}
        >
          ▣ {caption}
        </figcaption>
      ) : null}

      {!hasImage ? <span className="sr-only">{safeAlt}</span> : null}
    </figure>
  );
}
