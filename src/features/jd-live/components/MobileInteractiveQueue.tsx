"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";
import type { BroadcastSegment } from "../types";
import { CANONICAL_CATEGORIES, getPrioritizedStories } from "../lib/categories";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";
import { DurgSolarInlineAd } from "@/components/ads/DurgSolarInlineAd";

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

function QueueThumbnail({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) {
  const [error, setError] = React.useState(false);
  const normalizedSrc = React.useMemo(() => {
    if (!src) return "";
    let s = src.trim();
    if (s.startsWith("http://")) s = s.replace(/^http:\/\//i, "https://");
    return s;
  }, [src]);

  if (!normalizedSrc || !hasVerifiedRealMedia(normalizedSrc) || error) {
    return (
      <div
        className="jdl-mobile-queue__thumb-fallback"
        aria-hidden="true"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #102038 0%, #1c355e 100%)",
          color: "rgba(255, 255, 255, 0.72)",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.04em",
          textAlign: "center",
          padding: 2,
        }}
      >
        <span>जन दर्पण</span>
      </div>
    );
  }

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      fill
      sizes="84px"
      className="jdl-mobile-queue__thumb"
      style={{ objectFit: "cover" }}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => {
        console.warn("[MobileInteractiveQueue] Thumbnail failed to load:", normalizedSrc);
        setError(true);
      }}
    />
  );
}

/**
 * Interactive news feed for Jan Darpan Live.
 *
 * Requirements:
 * 1. Populates automatically on initial render (category: "सभी" by default).
 * 2. District-first ordering: active district stories first, then broader statewide stories.
 * 3. Category Filter Tabs: clean horizontal tab strip on desktop & mobile.
 * 4. Compact Card: Image -> District -> Headline (max 2 lines) -> Bottom-Right "पढ़ें" button.
 * 5. NO "TV पर देखें" or "TV पर चल रहा है" text on cards.
 * 6. NO "राज्य भर की लाइव खबरें देखें" empty state button.
 */
export function MobileInteractiveQueue() {
  const { state, dispatch, setCategory, setSelectedArticle } = useBroadcast();
  const { queue, currentSegment, language, selectedCategory } = state;
  const { prefs } = useReaderPreferences();

  // Clean stories pool
  const allStories = useMemo(() => {
    return queue.filter((s) => !s.isIntro);
  }, [queue]);

  // District-first ordering with statewide fallback + canonical category filter
  const filteredStories = useMemo(() => {
    return getPrioritizedStories(allStories, selectedCategory, prefs.homeDistrict);
  }, [allStories, selectedCategory, prefs.homeDistrict]);

  const handleSelectStoryOnTv = (seg: BroadcastSegment) => {
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

    if (typeof window !== "undefined") {
      const tvEl = document.querySelector(".jdl-tv");
      if (tvEl) {
        tvEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  const handleOpenArticle = (e: React.MouseEvent, story: BroadcastSegment) => {
    e.stopPropagation();
    setSelectedArticle(story);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const title = language === "hi" ? "ताज़ा खबरें" : "Latest News";

  return (
    <section className="jdl-mobile-queue" aria-label={title}>
      {/* Category Filter Tabs Bar (Requirement #4: Category controls behave like filter tabs) */}
      <div className="jdl-category-tabs-bar" role="navigation" aria-label={language === "hi" ? "समाचार श्रेणियां" : "News Categories"}>
        <div className="jdl-category-tabs-scroll" role="tablist">
          {CANONICAL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const label = language === "hi" ? cat.labelHi : cat.labelEn;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setCategory(cat.id)}
                className={`jdl-category-tab ${isSelected ? "jdl-category-tab--active" : ""}`}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Story List */}
      <div className="jdl-mobile-queue__list" role="list">
        {filteredStories.length === 0 ? (
          allStories.length === 0 ? (
            /* Sleek skeleton placeholder while loading initial broadcast */
            <div className="jdl-mobile-queue__skeleton-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="jdl-mobile-queue__skeleton-card" />
              ))}
            </div>
          ) : (
            /* Category empty state (only shown if entire state newsroom has 0 stories for this category) */
            <div className="jdl-category-empty-state">
              <div className="jdl-category-empty-state__icon" aria-hidden="true">
                📰
              </div>
              <p className="jdl-category-empty-state__msg">
                {language === "hi"
                  ? "इस श्रेणी में अभी कोई खबर उपलब्ध नहीं है।"
                  : "No stories available in this category right now."}
              </p>
              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className="jdl-category-empty-state__btn"
                >
                  {language === "hi" ? "सभी खबरें देखें" : "View all news"}
                </button>
              )}
            </div>
          )
        ) : (
          filteredStories.map((story, idx) => {
            const isActiveOnTv = currentSegment?.id === story.id;
            const headline =
              language === "en"
                ? story.headlineEn || story.headline
                : story.headlineHi || story.headline;
            const rawDistrict =
              language === "en"
                ? story.districtEn || story.district
                : story.districtHi || story.district;
            const validDistrict =
              rawDistrict && rawDistrict !== "छत्तीसगढ़" && rawDistrict !== "Chhattisgarh"
                ? rawDistrict
                : null;
            const category =
              language === "en"
                ? story.categoryLabelEn || story.categoryLabel
                : story.categoryLabelHi || story.categoryLabel;
            const locationTag =
              validDistrict ||
              (category && category !== "छत्तीसगढ़" && category !== "Chhattisgarh" ? category : null) ||
              (language === "hi" ? "राज्य डेस्क" : "State Desk");
            const timeLabel = formatRelativeTime(story.publishedAt, language);

            return (
              <React.Fragment key={story.id}>
                {/* Fast-scanning compact card: Tapping anywhere (image, headline, body) plays story on TV */}
                <article
                  className={`jdl-queue-card ${isActiveOnTv ? "jdl-queue-card--tv-active" : ""}`}
                  onClick={() => handleSelectStoryOnTv(story)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const target = e.target as HTMLElement | null;
                      if (target && target.closest("button")) return;
                      e.preventDefault();
                      handleSelectStoryOnTv(story);
                    }
                  }}
                  aria-label={`${headline} — ${language === "hi" ? "TV पर चलाएं" : "Play on TV"}`}
                >
                  {/* Left: Thumbnail (tappable to play on TV) */}
                  <div
                    className="jdl-queue-card__thumb-wrap"
                    aria-hidden="true"
                  >
                    <QueueThumbnail src={story.imageUrl} alt="" />
                  </div>

                  {/* Right: Content Column */}
                  <div className="jdl-queue-card__body">
                    {/* District / Area Name + Time */}
                    <div className="jdl-queue-card__meta">
                      <span className="jdl-queue-card__tag">📍 {locationTag}</span>
                      {story.isBreaking && (
                        <span className="jdl-queue-card__breaking">
                          {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
                        </span>
                      )}
                      <span className="jdl-queue-card__time">{timeLabel}</span>
                    </div>

                    {/* Headline: maximum two lines - selecting card body plays story on TV */}
                    <h3
                      className="jdl-queue-card__headline"
                      title={headline}
                    >
                      {headline}
                    </h3>

                    {/* Bottom Action Row: Playback state + Exclusive "पढ़ें" button */}
                    <div className="jdl-queue-card__action-row">
                      {isActiveOnTv ? (
                        <span className="jdl-queue-card__live-indicator">
                          <span className="jdl-queue-card__pulse-dot" aria-hidden="true" />
                          <span>{language === "hi" ? "चल रहा है" : "Playing"}</span>
                        </span>
                      ) : (
                        <span />
                      )}

                      {/* ONLY this action opens the article reader */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenArticle(e, story)}
                        className="jdl-queue-card__read-btn"
                        aria-label={`${headline} — ${language === "hi" ? "पढ़ें" : "Read"}`}
                      >
                        <span>{language === "hi" ? "पढ़ें" : "Read"}</span>
                      </button>
                    </div>
                  </div>
                </article>

                {(idx + 1) % 5 === 0 && (
                  <DurgSolarInlineAd index={Math.floor((idx + 1) / 5)} />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </section>
  );
}
