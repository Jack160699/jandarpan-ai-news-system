"use client";

import { useState } from "react";
import Link from "next/link";
import { ArticleImage } from "../../components/ArticleImage";
import { Tag } from "../../components/primitives";
import { JdIcon } from "../../components/icons";

type PhotoGalleryProps = {
  images: Array<{ src?: string | null; caption?: string | null; alt: string }>;
  kicker?: string;
  backHref?: string;
};

/** B14 — dark immersive photo story with swipe indicators. */
export function PhotoGallery({ images, kicker, backHref = "/" }: PhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const safe = images.length ? images : [{ src: null, caption: null, alt: "फ़ोटो" }];
  const current = safe[Math.min(index, safe.length - 1)];
  const total = safe.length;

  return (
    <div
      className="jd-ds"
      data-theme="dark"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0e1626",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: "9px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href={backHref} aria-label="वापस" style={{ display: "flex", color: "#e7edf6" }}>
          <JdIcon name="arrowL" size={22} stroke={2} color="#e7edf6" />
        </Link>
        <span className="jd-ui" style={{ fontSize: 12, fontWeight: 700, color: "#e7edf6" }}>
          फ़ोटो स्टोरी
        </span>
        <button
          type="button"
          aria-label="शेयर"
          data-action="share"
          style={{ background: "none", border: "none", display: "flex", cursor: "pointer" }}
        >
          <JdIcon name="share" size={20} stroke={1.8} color="#e7edf6" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % total)}
        style={{
          flex: 1,
          position: "relative",
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          minHeight: 420,
        }}
        aria-label="अगली फ़ोटो"
      >
        <ArticleImage
          src={current.src}
          alt={current.alt}
          ratio="photo"
          sizes="100vw"
          tone="festival"
          priority
        />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
          }}
        >
          {safe.slice(0, 5).map((_, i) => (
            <span
              key={i}
              aria-hidden
              style={{
                width: i === index % Math.min(5, total) ? 18 : 6,
                height: 6,
                borderRadius: 6,
                background: i === index % Math.min(5, total) ? "var(--jd-gold)" : "rgba(255,255,255,.4)",
              }}
            />
          ))}
        </div>
      </button>

      <div style={{ flexShrink: 0, padding: "14px 16px 16px", background: "#0e1626" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          {kicker ? <Tag color="var(--jd-gold)">{kicker}</Tag> : <span />}
          <span className="jd-ui" style={{ fontSize: 12, fontWeight: 700, color: "#93a4c2" }}>
            {index + 1} / {total}
          </span>
        </div>
        <p
          className="jd-serif"
          style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#e7edf6" }}
        >
          {current.caption || current.alt}
        </p>
      </div>
    </div>
  );
}
