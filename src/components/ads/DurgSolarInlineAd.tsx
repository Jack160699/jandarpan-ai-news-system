"use client";

import React from "react";

type DurgSolarInlineAdProps = {
  index?: number;
  className?: string;
};

/**
 * Approved Durg Solar Inline News Feed Advertisement Creative.
 *
 * Requirements:
 * - Appears naturally inside news feeds after every 3 articles.
 * - Uses approved creative: /jd-live/durg-solar-creative.png (1024x257).
 * - Preserves aspect ratio: no distortion, no stretching, no cropping.
 * - Renders responsively on mobile and desktop without becoming oversized.
 * - NO Share, WhatsApp, Play, Pause, Mute, or extra navigation controls.
 * - Click navigates to https://durgsolar.com.
 */
export function DurgSolarInlineAd({ index, className = "" }: DurgSolarInlineAdProps) {
  return (
    <div
      className={`jd-inline-ad ${className}`}
      role="region"
      aria-label="Durg Solar Advertisement"
      data-testid="durg-solar-inline-ad"
      data-ad-index={index != null ? String(index) : undefined}
      data-ad-type="inline-commercial"
      style={{
        width: "100%",
        margin: "14px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          padding: "0 2px",
        }}
      >
        <span
          className="jd-ui"
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--jd-muted, #8c827a)",
          }}
        >
          विज्ञापन / Advertisement
        </span>
        <span
          className="jd-ui"
          style={{
            fontSize: "10px",
            color: "var(--jd-muted, #8c827a)",
          }}
        >
          दुर्ग सोलर
        </span>
      </div>

      <a
        href="https://durgsolar.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Durg Solar: Waaree 3 kW ₹72,000* | 5 kW ₹1,82,000* — Call +91 77778 12777 | durgsolar.com"
        aria-label="Durg Solar Advertisement"
        style={{
          display: "block",
          width: "100%",
          borderRadius: "6px",
          overflow: "hidden",
          textDecoration: "none",
          background: "#08101e",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          border: "1px solid rgba(193, 154, 62, 0.25)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <img
          src="/jd-live/durg-solar-creative.png"
          alt="Durg Solar: Waaree 3 kW ₹72,000*, 5 kW ₹1,82,000*, Call +91 77778 12777, durgsolar.com"
          width={1024}
          height={257}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            aspectRatio: "1024 / 257",
            objectFit: "contain",
          }}
          loading="lazy"
          decoding="async"
        />
      </a>
    </div>
  );
}
