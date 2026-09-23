"use client";

import React from "react";
import { useBroadcast } from "../BroadcastContext";
import Image from "next/image";

/**
 * Fixed AI anchor figure with CSS-driven lip-sync animation.
 * Mouth animation is driven by the amplitude value (0–1) from BroadcastContext.
 */
export function AnchorFigure() {
  const { state } = useBroadcast();
  const { amplitude, anchorState } = state;
  const isSpeaking = anchorState === "speaking";

  // Map amplitude (0–1) to mouth open scale (px)
  const mouthOpenPx = Math.round(amplitude * 6);
  const mouthWidthPx = 14 + Math.round(amplitude * 4);

  return (
    <div className="jdl-anchor" data-speaking={isSpeaking} aria-label="Jan Darpan Anchor">
      {/* Studio backdrop layered behind the anchor figure */}
      <div className="jdl-anchor__backdrop" />

      {/* Anchor figure container with 3:4 portrait aspect ratio */}
      <div className="jdl-anchor__figure-box">
        <Image
          src="/jd-live/anchor-seated.jpg"
          alt="Jan Darpan Live Anchor"
          fill
          priority
          sizes="360px"
          className="jdl-anchor__img"
          style={{ objectFit: "contain", objectPosition: "bottom center" }}
        />

        {/* CSS lip-sync mouth overlay — positioned precisely over anchor's lips */}
        {isSpeaking && (
          <div
            className="jdl-anchor__mouth"
            aria-hidden
            style={{
              width: mouthWidthPx,
              height: Math.max(2, mouthOpenPx),
            }}
          />
        )}
      </div>

      {/* Subtle idle breathing animation ring */}
      <div className="jdl-anchor__idle-ring" aria-hidden />
    </div>
  );
}
