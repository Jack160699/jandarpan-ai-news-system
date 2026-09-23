"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  headline?: string;
  imageUrl?: string;
  language?: "hi" | "en";
};

/**
 * Compact Jan Darpan Live preview card for the homepage.
 * Does NOT load audio, video engine, or broadcast context.
 * Serves purely as a thumbnail + CTA.
 */
export function JanDarpanLivePreview({ headline, imageUrl, language = "hi" }: Props) {
  const label = language === "hi" ? "जन दर्पण लाइव" : "JAN DARPAN LIVE";
  const cta = language === "hi" ? "लाइव देखें →" : "Watch Live →";
  const liveTag = language === "hi" ? "लाइव" : "LIVE";

  return (
    <Link
      href="/live"
      className="jdl-preview"
      aria-label={label}
      style={{
        display: "block",
        borderRadius: 8,
        overflow: "hidden",
        background: "linear-gradient(135deg, #0a1628 0%, #0f2040 100%)",
        border: "1px solid rgba(200,16,46,0.3)",
        textDecoration: "none",
        color: "inherit",
        position: "relative",
        minHeight: 120,
      }}
    >
      {/* Background image */}
      {imageUrl && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="300px"
            style={{ objectFit: "cover", opacity: 0.35 }}
          />
        </div>
      )}

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(10,22,40,0.7), rgba(10,22,40,0.95))",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          height: "100%",
        }}
      >
        {/* Label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: "#c8102e",
              color: "#fff",
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: "0.1em",
              padding: "2px 6px",
              borderRadius: 2,
            }}
          >
            ● {liveTag}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.05em",
            }}
          >
            {label}
          </span>
        </div>

        {/* Studio still with anchor silhouette */}
        <div
          style={{
            position: "relative",
            borderRadius: 4,
            overflow: "hidden",
            flex: 1,
            minHeight: 70,
            background: "rgba(15,32,64,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src="/jd-live/anchor-seated.jpg"
            alt=""
            fill
            sizes="200px"
            style={{ objectFit: "cover", objectPosition: "top center", opacity: 0.6 }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, transparent, rgba(10,22,40,0.8))",
            }}
          />
          {headline && (
            <div
              style={{
                position: "absolute",
                bottom: 6,
                left: 8,
                right: 8,
                fontSize: 10.5,
                fontWeight: 700,
                color: "#f0f4fa",
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {headline}
            </div>
          )}
        </div>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            fontSize: 11,
            fontWeight: 700,
            color: "#c8102e",
            letterSpacing: "0.04em",
          }}
        >
          {cta}
        </div>
      </div>
    </Link>
  );
}
