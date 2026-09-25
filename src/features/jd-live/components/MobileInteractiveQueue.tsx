"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useBroadcast } from "../BroadcastContext";
import type { BroadcastSegment } from "../types";

function formatRelativeTime(dateStr?: string, lang: "hi" | "en" = "hi"): string {
  if (!dateStr) return lang === "hi" ? "अभी" : "Just now";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return lang === "hi" ? "अभी" : "Just now";
    if (diffMins < 60) return lang === "hi" ? `${diffMins} मि. पहले` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return lang === "hi" ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return lang === "hi" ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
  } catch {
    return lang === "hi" ? "आज" : "Today";
  }
}

/**
 * Mobile interactive story queue for Jan Darpan Live TV.
 *
 * Appears immediately below the 16:9 TV viewport on mobile.
 * Connects directly to the central broadcast engine:
 *   - Tapping any story instantly selects and plays it in Jan Darpan TV.
 *   - Highlights the currently playing story in sync with the TV.
 *   - Completely hidden on desktop/tablet (>= 768px).
 */
export function MobileInteractiveQueue() {
  const { state, dispatch } = useBroadcast();
  const { queue, currentSegment, language } = state;

  const stories = useMemo(() => {
    return queue.filter((s) => !s.isIntro);
  }, [queue]);

  const handleSelectStory = (seg: BroadcastSegment) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("jdl_audio_unlocked", "1");
        if ("speechSynthesis" in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch {}

    dispatch({ type: "INTERRUPT_BREAKING", segment: seg });
    dispatch({ type: "SET_PLAYING", isPlaying: true });
    dispatch({ type: "SET_MUTED", isMuted: false });

    // Smoothly scroll to TV so user watches anchor delivery
    if (typeof window !== "undefined") {
      const tvEl = document.querySelector(".jdl-tv");
      if (tvEl) {
        tvEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  const title = language === "hi" ? "ताज़ा खबरें" : "Latest News";
  const seeAllLabel = language === "hi" ? "सभी देखें ›" : "See all ›";

  return (
    <section className="jdl-mobile-queue" aria-label={title}>
      {/* Header bar */}
      <div className="jdl-mobile-queue__header">
        <div className="jdl-mobile-queue__title-wrap">
          <span className="jdl-mobile-queue__live-dot" aria-hidden="true" />
          <h2 className="jdl-mobile-queue__title">{title}</h2>
          <span className="jdl-mobile-queue__sublabel">
            {language === "hi" ? "चुनें और टीवी पर देखें" : "Tap to watch"}
          </span>
        </div>
        <Link href="/latest" className="jdl-mobile-queue__see-all">
          {seeAllLabel}
        </Link>
      </div>

      {/* Story list */}
      <div className="jdl-mobile-queue__list" role="list">
        {stories.length === 0 ? (
          /* Sleek skeleton placeholder while loading first feed */
          <div className="jdl-mobile-queue__skeleton-wrap">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="jdl-mobile-queue__skeleton-card" />
            ))}
          </div>
        ) : (
          stories.map((story) => {
            const isActive = currentSegment?.id === story.id;
            const headline =
              language === "hi"
                ? story.headlineHi || story.headline
                : story.headline;
            const category =
              language === "hi"
                ? story.categoryLabelHi || story.categoryLabel
                : story.categoryLabel;
            const rawDistrict =
              language === "hi"
                ? story.districtHi || story.district
                : story.district;
            const validDistrict =
              rawDistrict && rawDistrict !== "छत्तीसगढ़" && rawDistrict !== "Chhattisgarh"
                ? rawDistrict
                : null;
            const locationTag =
              validDistrict ||
              (category && category !== "छत्तीसगढ़" && category !== "Chhattisgarh" ? category : null) ||
              (language === "hi" ? "राज्य डेस्क" : "State Desk");
            const timeLabel = formatRelativeTime(story.publishedAt, language);

            return (
              <button
                type="button"
                key={story.id}
                onClick={() => handleSelectStory(story)}
                className={`jdl-mobile-queue__item ${
                  isActive ? "jdl-mobile-queue__item--active" : ""
                }`}
                aria-pressed={isActive}
                aria-label={`${headline} — ${
                  isActive
                    ? language === "hi"
                      ? "टीवी पर चल रहा है"
                      : "Now playing on TV"
                    : language === "hi"
                    ? "टीवी पर देखें"
                    : "Watch on TV"
                }`}
              >
                {/* Thumbnail */}
                <div className="jdl-mobile-queue__thumb-wrap">
                  {story.imageUrl ? (
                    <Image
                      src={story.imageUrl}
                      alt=""
                      fill
                      sizes="76px"
                      className="jdl-mobile-queue__thumb"
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  ) : (
                    <div className="jdl-mobile-queue__thumb-ph" />
                  )}
                  {/* Overlay small play badge on thumbnail */}
                  <span className="jdl-mobile-queue__thumb-play" aria-hidden="true">
                    {isActive ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4.5l14 7.5-14 7.5v-15z" />
                      </svg>
                    )}
                  </span>
                </div>

                {/* Body Content */}
                <div className="jdl-mobile-queue__body">
                  <div className="jdl-mobile-queue__meta-row">
                    <span className="jdl-mobile-queue__tag">{locationTag}</span>
                    {story.isBreaking && (
                      <span className="jdl-mobile-queue__breaking-badge">
                        {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
                      </span>
                    )}
                  </div>

                  <h3 className="jdl-mobile-queue__headline">{headline}</h3>

                  <div className="jdl-mobile-queue__foot-row">
                    <span className="jdl-mobile-queue__time">{timeLabel}</span>
                    {isActive ? (
                      <span className="jdl-mobile-queue__indicator jdl-mobile-queue__indicator--active">
                        <span className="jdl-mobile-queue__active-dot" aria-hidden="true" />
                        {language === "hi" ? "चल रहा है" : "Playing"}
                      </span>
                    ) : (
                      <span className="jdl-mobile-queue__indicator">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M6 4.5l14 7.5-14 7.5v-15z" />
                        </svg>
                        <span>{language === "hi" ? "देखें" : "Watch"}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
