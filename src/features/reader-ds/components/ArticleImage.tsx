"use client";

import { useState } from "react";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { JdIcon } from "./icons";

export type JdImageRatio = "lead" | "video" | "thumb" | "photo" | "square";

const RATIO: Record<JdImageRatio, string> = {
  lead: "3 / 2",
  video: "16 / 9",
  thumb: "1 / 1",
  photo: "4 / 5",
  square: "1 / 1",
};

const CDN_ASPECT: Record<JdImageRatio, "16:9" | "4:3" | "1:1" | "4:5"> = {
  lead: "4:3",
  video: "16:9",
  thumb: "1:1",
  photo: "4:5",
  square: "1:1",
};

const WIDTH: Record<JdImageRatio, number> = {
  lead: 640,
  video: 640,
  thumb: 200,
  photo: 500,
  square: 200,
};

type ArticleImageProps = {
  src?: string | null;
  alt: string;
  ratio?: JdImageRatio;
  caption?: string | null;
  className?: string;
  priority?: boolean;
  sizes?: string;
  rounded?: boolean;
};

/**
 * Reader-DS image with stable aspect ratio, CDN payload reduction, graceful
 * missing/broken-image fallback, and data-saving support (media hidden via
 * `.jd-img-media` under `.jd-ds[data-saver="1"]`).
 *
 * Uses a plain <img> because the app has no next/image remote allowlist; the
 * URL is optimised via `optimizeCdnUrl` (auto webp/avif on supported CDNs).
 */
export function ArticleImage({
  src,
  alt,
  ratio = "lead",
  caption,
  className,
  priority = false,
  sizes,
  rounded = false,
}: ArticleImageProps) {
  const [failed, setFailed] = useState(false);
  const raw = src && src.trim() ? src.trim() : "";
  const hasImage = Boolean(raw) && !failed;
  const optimized = hasImage
    ? optimizeCdnUrl(raw, { width: WIDTH[ratio], aspect: CDN_ASPECT[ratio], quality: priority ? 82 : 74 })
    : "";

  return (
    <figure
      className={`jd-img${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        aspectRatio: RATIO[ratio],
        overflow: "hidden",
        borderRadius: rounded ? "var(--jd-radius-card)" : "var(--jd-radius)",
        background: "var(--jd-paper-2)",
        border: "1px solid var(--jd-line-2)",
        margin: 0,
      }}
    >
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
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--jd-muted)",
          }}
        >
          <JdIcon name="globe" size={26} stroke={1.6} />
          <span
            className="jd-ui"
            style={{ fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase" }}
          >
            जनदर्पण
          </span>
        </div>
      )}
      {caption ? (
        <figcaption
          className="jd-ui"
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            padding: "3px 8px",
            fontSize: 9.5,
            color: "#fff",
            background: "linear-gradient(0deg, rgba(8,27,58,.72), transparent)",
            width: "100%",
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
