"use client";

import { useEffect, useState } from "react";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";

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
};

/**
 * Reader-DS image — fixed 190px lead height, CDN crop, design-style
 * tinted fallback (not a grey globe watermark).
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
}: ArticleImageProps) {
  const [failed, setFailed] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);
  const [dataSaving, setDataSaving] = useState(false);
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
  const raw = src && src.trim() ? src.trim() : "";
  const blocked = dataSaving && !forceLoad && Boolean(raw);
  const hasImage = Boolean(raw) && !failed && !blocked;
  const optimized = hasImage
    ? optimizeCdnUrl(raw, {
        width: WIDTH[ratio],
        aspect: CDN_ASPECT[ratio],
        quality: priority ? 82 : 74,
      })
    : "";

  const fixedH = FIXED_H[ratio];
  const [c0, c1] = TONES[tone] ?? TONES.city;

  return (
    <figure
      className={`jd-img${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        height: fixedH,
        aspectRatio: fixedH ? undefined : RATIO[ratio],
        overflow: "hidden",
        borderRadius: "var(--jd-radius)",
        margin: 0,
        background: `linear-gradient(135deg, ${c0}, ${c1})`,
      }}
    >
      {/* hatch pattern matching design placeholders */}
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
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          sizes={sizes}
          onError={() => setFailed(true)}
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

      {blocked ? (
        <button
          type="button"
          onClick={() => setForceLoad(true)}
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

      {/* sr-only alt when no real image */}
      {!hasImage ? <span className="sr-only">{alt}</span> : null}
    </figure>
  );
}
