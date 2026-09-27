"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { selectNextPlayableStory } from "../lib/queue-engine";

/**
 * Single clean virtual broadcast display for Jan Darpan Live TV.
 *
 * Rules:
 * - One coherent virtual story display filling the designated news screen area cleanly.
 * - Upper-right inside the story screen: exactly ONE location badge (📍 [District] or 📍 राज्य डेस्क).
 * - REAL SOURCE MEDIA ONLY: Every story displays its verified genuine publisher photograph.
 * - Never shows generic stock Unsplash images, AI placeholders, or fake graphics.
 * - Synchronized dynamically with current story.
 */
export function NewsScreen() {
  const { state } = useBroadcast();
  const { currentSegment, currentIndex, queue, language } = state;
  const [imageError, setImageError] = useState(false);
  const [aspectFit, setAspectFit] = useState<"cover" | "contain">("cover");

  // Preload next story image — use authoritative canonical next story, not index arithmetic
  useEffect(() => {
    if (typeof window === "undefined" || !queue || queue.length <= 1 || !currentSegment) return;
    const nextSeg = selectNextPlayableStory({
      queue,
      consumedIds: state.consumedIds,
      activeStoryId: currentSegment.id,
    });
    if (nextSeg?.imageUrl && hasVerifiedRealMedia(nextSeg.imageUrl)) {
      const preloadImg = new window.Image();
      preloadImg.src = nextSeg.imageUrl;
    }
  }, [currentSegment?.id, queue, state.consumedIds]);

  // Reset error states on story change
  useEffect(() => {
    setImageError(false);
  }, [currentSegment?.id]);

  const seg = currentSegment;
  const headline =
    language === "hi" ? (seg?.headlineHi || seg?.headline) : seg?.headline;
  const rawDistrict =
    language === "hi" ? (seg?.districtHi || seg?.district) : seg?.district;

  // Resolve Canonical Location: Real district (Durg, Raipur, Bilaspur, Bastar, etc.) or "राज्य डेस्क"
  const displayLocation = useMemo(() => {
    if (!seg) return null;
    if (rawDistrict && rawDistrict !== "छत्तीसगढ़" && rawDistrict !== "Chhattisgarh") {
      return rawDistrict;
    }
    // Attempt district resolution from headline and summary
    const resolved = resolveCanonicalStoryDistrict({
      headline: seg.headline,
      summary: seg.summary,
      section: seg.section,
    });
    if (resolved.nameHi && !resolved.isStatewide) {
      return language === "hi" ? resolved.nameHi : resolved.nameEn;
    }
    return language === "hi" ? "राज्य डेस्क" : "State Desk";
  }, [seg?.id, seg?.headline, seg?.summary, seg?.section, rawDistrict, language]);

  // Determine active media URL — Genuine Real Source Media Only or approved Ad Creative
  const isAd = Boolean(seg?.isAd);

  const activeMediaUrl = useMemo(() => {
    let img = seg?.imageUrl?.trim() || "";
    if (img.startsWith("http://")) {
      img = img.replace(/^http:\/\//i, "https://");
    }
    if (isAd && img) return img;
    if (img && !imageError && hasVerifiedRealMedia(img)) {
      return img;
    }
    return null;
  }, [seg?.id, seg?.imageUrl, imageError, isAd]);

  return (
    <div className={`jdl-virtual-screen ${isAd ? "jdl-virtual-screen--ad" : ""}`} aria-live="polite">
      {/* Story media container */}
      <div className="jdl-virtual-screen__media-box">
        {isAd ? (
          /* TV Advertisement Display: Clean aspect-ratio container with dedicated advertisement styling */
          <div
            className="jdl-tv-ad-screen"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#08101e",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                zIndex: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(193, 154, 62, 0.92)",
                color: "#08101e",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span>📢 विज्ञापन</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>दुर्ग सोलर</span>
            </div>
            {activeMediaUrl && (
              <img
                src={activeMediaUrl}
                alt="दुर्ग सोलर — विशेष विज्ञापन"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            )}
          </div>
        ) : activeMediaUrl ? (
          <>
            {/* Ambient background matching the news photograph */}
            <div
              className="jdl-virtual-screen__ambient-bg"
              style={{
                backgroundImage: `url(${activeMediaUrl})`,
              }}
              aria-hidden="true"
            />

            {/* Sharp foreground news photograph — unoptimized allows all external news sources */}
            <Image
              key={`${seg?.id || "seg"}_${activeMediaUrl}`}
              src={activeMediaUrl}
              alt={headline || ""}
              fill
              sizes="(max-width: 767px) 100vw, 68vw"
              className="jdl-virtual-screen__img"
              style={{ objectFit: aspectFit }}
              priority
              unoptimized
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  const ratio = img.naturalWidth / img.naturalHeight;
                  setAspectFit(ratio >= 1.45 && ratio <= 1.88 ? "cover" : "contain");
                }
              }}
              onError={(e) => {
                if (!imageError && seg?.imageUrl) {
                  console.warn(
                    "[JanDarpan Live TV] Source media load failed for story:",
                    seg.id,
                    "URL:",
                    activeMediaUrl,
                    "Error event:",
                    e.type
                  );
                  setImageError(true);
                }
              }}
            />

            {/* Subtle television display gradient overlay for depth */}
            <div className="jdl-virtual-screen__overlay" aria-hidden="true" />
          </>
        ) : (
          /* High-resolution broadcast fallback graphic (clean neutral fallback) */
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
                {displayLocation || (language === "hi" ? "विशेष कवरेज" : "Special Coverage")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating location tag inside the story image/video in the UPPER-LEFT */}
      {displayLocation && (
        <div className="jdl-virtual-screen__location-tag" aria-hidden="true">
          <span className="jdl-virtual-screen__pin">📍</span>
          <span>{displayLocation}</span>
        </div>
      )}
    </div>
  );
}
