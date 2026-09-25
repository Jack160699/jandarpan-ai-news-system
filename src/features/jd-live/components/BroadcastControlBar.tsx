"use client";

import React from "react";

/**
 * BroadcastControlBar — Dedicated Durg Solar Advertisement Area
 *
 * Requirements:
 * - Approved creative: /jd-live/durg-solar-creative.png (1024x305, aspect 3.36:1).
 * - ADVERTISEMENT ONLY: NO Share, NO WhatsApp, NO Play, NO Mute buttons beside or inside the ad area.
 * - Entire available advertisement area is used for that image.
 * - Preserves aspect ratio: no stretching, no distortion, no cropping of logos or text.
 * - Dial +91 77778 12777 directly on click.
 */
export function BroadcastControlBar() {
  return (
    <div className="jdl-ad-banner" role="region" aria-label="Durg Solar Advertisement">
      <a
        href="tel:+917777812777"
        className="jdl-ad-banner__link"
        title="Durg Solar: Waaree 3 kW ₹72,000* | 5 kW ₹1,82,000* — Call +91 77778 12777"
        aria-label="Durg Solar Advertisement"
      >
        <img
          src="/jd-live/durg-solar-creative.png"
          alt="Durg Solar: Waaree 3 kW ₹72,000*, 5 kW ₹1,82,000*, Call +91 77778 12777"
          className="jdl-ad-banner__img"
          width={1024}
          height={305}
          loading="eager"
          decoding="async"
        />
      </a>
    </div>
  );
}
