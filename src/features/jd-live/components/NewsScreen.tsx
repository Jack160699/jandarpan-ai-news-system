"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";
import { detectSemanticTopic } from "@/lib/news/images/editorial-visual-fallbacks";
import { getCategoryVisualTemplate } from "@/lib/news/ai/editorial-image-brand";
import { EDITORIAL_IMAGES } from "@/lib/editorial-images";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";

/**
 * Single clean virtual broadcast display for Jan Darpan Live TV.
 *
 * Rules:
 * - One coherent virtual story display filling the designated news screen area cleanly.
 * - Upper-right inside the story screen: exactly ONE location badge (📍 [District] or 📍 राज्य डेस्क).
 * - Deterministic fallback hierarchy: Primary Story Media -> Validated Contextual Media -> Broadcast Card.
 * - Never shows broken image icon or empty black void.
 * - Synchronized dynamically with current story.
 */
export function NewsScreen() {
  const { state } = useBroadcast();
  const { currentSegment, currentIndex, queue, language } = state;
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
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

  // Reset error states on story change
  useEffect(() => {
    setImageError(false);
    setFallbackError(false);
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

  // Validated contextual fallback media if primary image is missing, generic, or broken
  const fallbackMediaUrl = useMemo(() => {
    if (!seg) return "";
    const text = `${seg.headline || ""} ${seg.summary || ""}`;
    const topic = detectSemanticTopic(seg.categoryLabel, text);
    if (topic) {
      const template = getCategoryVisualTemplate(topic);
      if (template && EDITORIAL_IMAGES[template.fallbackKey]) {
        return optimizeCdnImageUrl(EDITORIAL_IMAGES[template.fallbackKey], 1200);
      }
    }
    if (displayLocation) {
      const loc = displayLocation.toLowerCase();
      if (loc.includes("बस्तर") || loc.includes("bastar")) {
        return optimizeCdnImageUrl(EDITORIAL_IMAGES.folkCulture, 1200);
      }
      if (loc.includes("दुर्ग") || loc.includes("भिलाई") || loc.includes("durg") || loc.includes("bhilai")) {
        return optimizeCdnImageUrl(EDITORIAL_IMAGES.steelIndustry, 1200);
      }
      if (loc.includes("बिलासपुर") || loc.includes("bilaspur")) {
        return optimizeCdnImageUrl(EDITORIAL_IMAGES.legalCrime, 1200);
      }
    }
    return optimizeCdnImageUrl(EDITORIAL_IMAGES.civicOffice, 1200);
  }, [seg?.id, seg?.headline, seg?.summary, seg?.categoryLabel, displayLocation]);

  // Determine active media URL — Priority 1: Real article image
  const activeMediaUrl = useMemo(() => {
    let img = seg?.imageUrl?.trim() || "";
    if (img.startsWith("http://")) {
      img = img.replace(/^http:\/\//i, "https://");
    }
    if (img && !imageError) {
      return img;
    }
    if (fallbackMediaUrl && !fallbackError) {
      return fallbackMediaUrl;
    }
    return null;
  }, [seg?.id, seg?.imageUrl, imageError, fallbackMediaUrl, fallbackError]);

  return (
    <div className="jdl-virtual-screen" aria-live="polite">
      {/* Story media container */}
      <div className="jdl-virtual-screen__media-box">
        {activeMediaUrl ? (
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
                } else {
                  console.warn("[JanDarpan Live TV] Fallback media load failed for story:", seg?.id, fallbackMediaUrl);
                  setFallbackError(true);
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
