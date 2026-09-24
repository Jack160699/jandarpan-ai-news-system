"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";

/**
 * The large dynamic news screen displayed prominently in the studio.
 * Shows story image + headline overlay with smooth crossfade transitions.
 */
export function NewsScreen() {
  const { state } = useBroadcast();
  const { currentSegment, language } = state;
  const [displayedSegment, setDisplayedSegment] = useState(currentSegment);
  const [fading, setFading] = useState(false);

  // Crossfade between segments
  useEffect(() => {
    if (!currentSegment || currentSegment.id === displayedSegment?.id) return;
    setFading(true);
    const t = setTimeout(() => {
      setDisplayedSegment(currentSegment);
      setFading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [currentSegment, displayedSegment]);

  const seg = displayedSegment;
  const headline =
    language === "hi" ? (seg?.headlineHi || seg?.headline) : seg?.headline;
  const district =
    language === "hi" ? (seg?.districtHi || seg?.district) : seg?.district;

  return (
    <div className={`jdl-newsscreen ${fading ? "jdl-newsscreen--fade" : ""}`} aria-live="polite">
      {/* Story image */}
      <div className="jdl-newsscreen__img-wrap">
        {seg?.imageUrl ? (
          <Image
            key={seg.id}
            src={seg.imageUrl}
            alt={headline || ""}
            fill
            sizes="(max-width: 767px) 100vw, 60vw"
            className="jdl-newsscreen__img"
            style={{ objectFit: "cover" }}
            priority
          />
        ) : (
          <div className="jdl-newsscreen__placeholder" />
        )}
        {/* Dark gradient overlay for visual depth */}
        <div className="jdl-newsscreen__overlay" />
      </div>

      {/* Subtle district/location tag */}
      {district && (
        <div className="jdl-newsscreen__location">{district}</div>
      )}
    </div>
  );
}
