"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";

/**
 * Single clean virtual broadcast display for Jan Darpan Live TV.
 * Dynamically adapts to story media proportions:
 *   - Widescreen 16:9 media: edge-to-edge full bleed (object-fit: cover).
 *   - Non-standard media (portrait, 4:3, square): object-fit: contain with ambient blurred studio bleed.
 *   - Preloads next story media in the background for zero-blank transitions.
 *   - Fallback broadcast card ensures zero broken image placeholders.
 */
export function NewsScreen() {
  const { state } = useBroadcast();
  const { currentSegment, currentIndex, queue, language } = state;
  const [imageError, setImageError] = useState(false);
  const [aspectFit, setAspectFit] = useState<"cover" | "contain">("cover");

  // Next story preload
  useEffect(() => {
    if (typeof window === "undefined" || !queue || queue.length <= 1) return;
    const nextIdx = (currentIndex + 1) % queue.length;
    const nextSeg = queue[nextIdx];
    if (nextSeg?.imageUrl) {
      const preloadImg = new window.Image();
      preloadImg.src = nextSeg.imageUrl;
    }
  }, [currentIndex, queue]);

  // Reset error state on story change
  useEffect(() => {
    setImageError(false);
  }, [currentSegment?.id]);

  const seg = currentSegment;
  const headline =
    language === "hi" ? (seg?.headlineHi || seg?.headline) : seg?.headline;
  const district =
    language === "hi" ? (seg?.districtHi || seg?.district) : seg?.district;
  const category =
    language === "hi" ? (seg?.categoryLabelHi || seg?.categoryLabel) : seg?.categoryLabel;

  const validDistrict =
    district && district !== "छत्तीसगढ़" && district !== "Chhattisgarh" && district !== "राज्य डेस्क"
      ? district
      : null;

  return (
    <div className="jdl-virtual-screen" aria-live="polite">
      {/* Story media container */}
      <div className="jdl-virtual-screen__media-box">
        {seg?.imageUrl && !imageError ? (
          <>
            {/* Ambient matching background bleed (prevents black/gray voids when aspect ratio is contained) */}
            <div
              className="jdl-virtual-screen__ambient-bg"
              style={{
                backgroundImage: `url(${seg.imageUrl})`,
              }}
              aria-hidden="true"
            />

            {/* Sharp foreground news photograph */}
            <Image
              key={seg.id}
              src={seg.imageUrl}
              alt={headline || ""}
              fill
              sizes="(max-width: 767px) 100vw, 68vw"
              className="jdl-virtual-screen__img"
              style={{ objectFit: aspectFit }}
              priority
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  const ratio = img.naturalWidth / img.naturalHeight;
                  // If within safe widescreen range (1.5 - 1.85), cover. Otherwise contain to protect faces/notices.
                  setAspectFit(ratio >= 1.45 && ratio <= 1.88 ? "cover" : "contain");
                }
              }}
              onError={() => setImageError(true)}
            />

            {/* Subtle television display scanline & gradient overlay for depth */}
            <div className="jdl-virtual-screen__overlay" aria-hidden="true" />
          </>
        ) : (
          /* High-resolution broadcast fallback graphic (never shows broken browser image icon) */
          <div className="jdl-virtual-screen__fallback" aria-hidden="true">
            <div className="jdl-virtual-screen__fallback-bg" />
            <div className="jdl-virtual-screen__fallback-content">
              <div className="jdl-virtual-screen__fallback-emblem">
                <svg viewBox="0 0 100 100" width="44" height="44">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A24B" strokeWidth="3" opacity="0.6" />
                  <circle cx="50" cy="38" r="8" fill="#C9A24B" />
                  <path d="M22 56 A28 28 0 0 1 78 56 Z" fill="#C8102E" />
                  <rect x="18" y="54" width="64" height="3.5" rx="1.75" fill="#C9A24B" />
                </svg>
              </div>
              <span className="jdl-virtual-screen__fallback-channel">
                {language === "hi" ? "जन दर्पण लाइव" : "JAN DARPAN LIVE"}
              </span>
              <span className="jdl-virtual-screen__fallback-tag">
                {validDistrict || category || (language === "hi" ? "विशेष कवरेज" : "Special Coverage")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating location tag inside the virtual display */}
      {validDistrict && (
        <div className="jdl-virtual-screen__location-tag" aria-hidden="true">
          <span className="jdl-virtual-screen__pin">📍</span>
          <span>{validDistrict}</span>
        </div>
      )}
    </div>
  );
}
