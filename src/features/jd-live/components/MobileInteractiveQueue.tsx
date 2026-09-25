"use client";

import React, { useMemo, useState, useRef, useEffect, Fragment } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";
import type { BroadcastSegment } from "../types";
import { CANONICAL_CATEGORIES, matchesCanonicalCategory, matchesDistrictScope } from "../lib/categories";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { isManualDistrictLocked } from "@/lib/district-intelligence";
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
 * Interactive story queue for Jan Darpan Live TV.
 *
 * Pinned TV-linked control area:
 *   - "ताज़ा खबरें चुनिए और TV पर देखें [ सभी ▼ ]"
 *   - Category dropdown filtering both news feed and TV broadcast.
 *   - Distinct "पढ़ें" action opening article in-place below sticky TV.
 */
export function MobileInteractiveQueue() {
  const { state, dispatch, setCategory, setSelectedArticle } = useBroadcast();
  const { queue, currentSegment, language, selectedCategory, selectedArticle } = state;
  const { prefs } = useReaderPreferences();

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
    };
    if (categoryMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [categoryMenuOpen]);

  // Clean stories pool
  const allStories = useMemo(() => {
    return queue.filter((s) => !s.isIntro);
  }, [queue]);

  // Check if user has explicitly chosen/locked a district
  const [isExplicitDistrict, setIsExplicitDistrict] = useState(false);
  useEffect(() => {
    setIsExplicitDistrict(isManualDistrictLocked());
  }, [prefs.homeDistrict]);

  // Filtered stories strictly respecting both CATEGORY + DISTRICT SCOPE
  const filteredStories = useMemo(() => {
    return allStories.filter((s) => {
      const matchCat = matchesCanonicalCategory(s, selectedCategory);
      const matchDist = matchesDistrictScope(s, prefs.homeDistrict, isExplicitDistrict);
      return matchCat && matchDist;
    });
  }, [allStories, selectedCategory, prefs.homeDistrict, isExplicitDistrict]);

  const activeCategoryObj = useMemo(() => {
    return (
      CANONICAL_CATEGORIES.find((c) => c.id === selectedCategory) ||
      CANONICAL_CATEGORIES[0]
    );
  }, [selectedCategory]);

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

    // Smoothly scroll to TV so user watches anchor delivery
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

    // Smooth scroll down to in-place article reader
    setTimeout(() => {
      const readerEl = document.getElementById("jd-inplace-article-reader");
      if (readerEl) {
        readerEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const title = language === "hi" ? "ताज़ा खबरें" : "Latest News";
  const sublabel = language === "hi" ? "चुनिए और TV पर देखें" : "Select to watch on TV";
  const fullLabel = language === "hi" ? "ताज़ा खबरें चुनिए और TV पर देखें" : "Latest News — Select to watch on TV";

  return (
    <section className="jdl-mobile-queue" aria-label={fullLabel}>
      {/* Pinned / Sticky Header bar with Category Selector */}
      <div className="jdl-mobile-queue__header">
        <div className="jdl-mobile-queue__title-wrap">
          <span className="jdl-mobile-queue__live-dot" aria-hidden="true" />
          <h2 className="jdl-mobile-queue__title">{title}</h2>
          <span className="jdl-mobile-queue__sublabel">{sublabel}</span>
        </div>

        {/* Compact Integrated Category Dropdown */}
        <div className="jdl-category-selector" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setCategoryMenuOpen((prev) => !prev)}
            className="jdl-category-selector__btn"
            aria-expanded={categoryMenuOpen}
            aria-haspopup="listbox"
            aria-label={language === "hi" ? "श्रेणी चुनें" : "Select Category"}
          >
            <span className="jdl-category-selector__label">
              {language === "hi" ? activeCategoryObj.labelHi : activeCategoryObj.labelEn}
            </span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`jdl-category-selector__arrow ${categoryMenuOpen ? "jdl-category-selector__arrow--open" : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {categoryMenuOpen && (
            <ul className="jdl-category-selector__menu" role="listbox">
              {CANONICAL_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const label = language === "hi" ? cat.labelHi : cat.labelEn;
                return (
                  <li key={cat.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={`jdl-category-selector__item ${
                        isSelected ? "jdl-category-selector__item--active" : ""
                      }`}
                      onClick={() => {
                        setCategory(cat.id);
                        setCategoryMenuOpen(false);
                      }}
                    >
                      <span>{label}</span>
                      {isSelected && (
                        <span className="jdl-category-selector__check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Story list */}
      <div className="jdl-mobile-queue__list" role="list">
        {filteredStories.length === 0 ? (
          allStories.length === 0 ? (
            /* Sleek skeleton placeholder while loading first feed */
            <div className="jdl-mobile-queue__skeleton-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="jdl-mobile-queue__skeleton-card" />
              ))}
            </div>
          ) : (
            /* Honest Empty State — No unrelated fallback injection */
            <div className="jdl-category-empty-state">
              <div className="jdl-category-empty-state__icon" aria-hidden="true">
                📰
              </div>
              <p className="jdl-category-empty-state__msg">
                {language === "hi"
                  ? "इस श्रेणी में इस जिले की कोई खबर अभी उपलब्ध नहीं है।"
                  : "No stories available in this category for the selected district."}
              </p>
              {selectedCategory !== "all" ? (
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className="jdl-category-empty-state__btn"
                >
                  {language === "hi" ? "सभी खबरें देखें" : "View all news"}
                </button>
              ) : isExplicitDistrict ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsExplicitDistrict(false);
                  }}
                  className="jdl-category-empty-state__btn"
                >
                  {language === "hi" ? "राज्यभर की लाइव खबरें देखें" : "View statewide live news"}
                </button>
              ) : null}
            </div>
          )
        ) : (
          filteredStories.map((story, idx) => {
            const isActive = currentSegment?.id === story.id;
            const isReading = selectedArticle?.id === story.id;
            const headline =
              language === "hi"
                ? story.headlineHi || story.headline
                : story.headline;
            const summary =
              language === "hi"
                ? story.summaryHi || story.summary
                : story.summary;
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
              <Fragment key={story.id}>
                <div
                  className={`jdl-mobile-queue__item ${
                    isActive ? "jdl-mobile-queue__item--active" : ""
                  } ${isReading ? "jdl-mobile-queue__item--reading" : ""}`}
                >
                  {/* Thumbnail / Image with TV Play button overlay */}
                  <div
                    className="jdl-mobile-queue__thumb-wrap"
                    onClick={() => handleSelectStoryOnTv(story)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectStoryOnTv(story);
                      }
                    }}
                    aria-label={`${language === "hi" ? "TV पर चलाएं" : "Play on TV"}: ${headline}`}
                  >
                    <QueueThumbnail src={story.imageUrl} alt="" />

                    {/* Small play overlay badge */}
                    <span className="jdl-mobile-queue__thumb-play" aria-hidden="true">
                      {isActive ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path
                            d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4.5l14 7.5-14 7.5v-15z" />
                        </svg>
                      )}
                    </span>
                  </div>

                  {/* Body Content with clear Editorial Hierarchy:
                      1. DISTRICT / AREA NAME
                      2. SPECIFIC NEWS HEADLINE
                      3. SHORT SUBHEADING (1-2 lines)
                      4. पढ़ें (Bold, visually highlighted button)
                  */}
                  <div className="jdl-mobile-queue__body">
                    {/* District / Area Name */}
                    <div className="jdl-mobile-queue__meta-row">
                      <span className="jdl-mobile-queue__tag">📍 {locationTag}</span>
                      {story.isBreaking && (
                        <span className="jdl-mobile-queue__breaking-badge">
                          {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
                        </span>
                      )}
                      <span className="jdl-mobile-queue__time">{timeLabel}</span>
                    </div>

                    {/* Specific News Headline */}
                    <h3
                      className="jdl-mobile-queue__headline"
                      onClick={() => handleSelectStoryOnTv(story)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectStoryOnTv(story);
                        }
                      }}
                    >
                      {headline}
                    </h3>

                    {/* Short Subheading (max 1-2 lines for fast scanning) */}
                    {summary && (
                      <p className="jdl-mobile-queue__subheading">
                        {summary}
                      </p>
                    )}

                    {/* Action Row: Bold "पढ़ें" Button + TV indicator */}
                    <div className="jdl-mobile-queue__foot-row">
                      {/* BOLD, VISUALLY HIGHLIGHTED, CLEARLY TAPPABLE "पढ़ें" BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenArticle(e, story)}
                        className={`jdl-mobile-queue__read-btn ${
                          isReading ? "jdl-mobile-queue__read-btn--active" : ""
                        }`}
                        aria-label={`${headline} — ${language === "hi" ? "खबर विस्तार से पढ़ें" : "Read article"}`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                        <span>{language === "hi" ? "पढ़ें" : "Read"}</span>
                      </button>

                      {/* TV Broadcast Status / Quick Watch trigger */}
                      {isActive ? (
                        <span className="jdl-mobile-queue__indicator jdl-mobile-queue__indicator--active">
                          <span className="jdl-mobile-queue__active-dot" aria-hidden="true" />
                          {language === "hi" ? "TV पर चल रहा है" : "On TV"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectStoryOnTv(story)}
                          className="jdl-mobile-queue__tv-watch-btn"
                          aria-label={language === "hi" ? "TV पर चलाएं" : "Play on TV"}
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M6 4.5l14 7.5-14 7.5v-15z" />
                          </svg>
                          <span>{language === "hi" ? "TV पर देखें" : "Watch on TV"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(idx + 1) % 4 === 0 && (
                  <DurgSolarInlineAd index={Math.floor((idx + 1) / 4)} />
                )}
              </Fragment>
            );
          })
        )}
      </div>
    </section>
  );
}
