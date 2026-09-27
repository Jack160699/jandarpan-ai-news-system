"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";
import type { BroadcastSegment } from "../types";
import { CANONICAL_CATEGORIES } from "../lib/categories";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";
import { DurgSolarInlineAd } from "@/components/ads/DurgSolarInlineAd";
import { CardEngagementRow, HeartIcon } from "./CardEngagementRow";
import { useStoryEngagement } from "../useStoryEngagement";
import { useStoryConsumption } from "../useStoryConsumption";

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
  const [error, setError] = useState(false);
  const normalizedSrc = useMemo(() => {
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
 * 1. Single source of truth: directly renders the canonical queue computed by BroadcastContext.
 * 2. Full-width engagement row spanning 100% width directly beneath the image + headline.
 * 3. Instagram-like double tap on story content triggers Like with subtle heart feedback.
 * 4. Single tap on story content plays/selects exact story on TV.
 * 5. Strict event isolation across all 5 engagement actions.
 */
export function MobileInteractiveQueue() {
  const { state, dispatch, setCategory, setSelectedArticle, selectStory } = useBroadcast();
  const { queue, activeStoryId, currentSegment, language, selectedCategory, consumedIds } = state;

  // Filter out any stray intro segments
  const displayedStories = useMemo(() => {
    return queue.filter((s) => !s.isIntro && !s.isAd);
  }, [queue]);

  const storyIds = useMemo(() => displayedStories.map((s) => s.id), [displayedStories]);
  const { consumedIds: remoteConsumedIds, markRead } = useStoryConsumption(storyIds);
  const { engagementMap, toggleLike, fetchComments, addComment } = useStoryEngagement(storyIds);

  // Sync authoritative consumption state from server to BroadcastContext
  useEffect(() => {
    if (remoteConsumedIds.size > 0) {
      let hasNew = false;
      for (const id of remoteConsumedIds) {
        if (!consumedIds.has(id)) {
          hasNew = true;
          break;
        }
      }
      if (hasNew) {
        const merged = new Set([...consumedIds, ...remoteConsumedIds]);
        dispatch({ type: "SET_CONSUMED_IDS", consumedIds: merged });
      }
    }
  }, [remoteConsumedIds, consumedIds, dispatch]);

  // Instagram-like Double-tap and Single-tap handling
  const [heartBursts, setHeartBursts] = useState<Record<string, boolean>>({});
  const clickTrackerRef = useRef<{ storyId: string; timestamp: number; timer: ReturnType<typeof setTimeout> | null }>({
    storyId: "",
    timestamp: 0,
    timer: null,
  });

  const handleSelectStoryOnTv = useCallback(
    (seg: BroadcastSegment) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("jdl_audio_unlocked", "1");
          if ("speechSynthesis" in window && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }
      } catch {}

      selectStory(seg);
      dispatch({ type: "SET_PLAYING", isPlaying: true });
      dispatch({ type: "SET_MUTED", isMuted: false });

      if (typeof window !== "undefined") {
        const tvEl = document.querySelector(".jdl-tv");
        if (tvEl) {
          tvEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    },
    [dispatch, selectStory]
  );

  const triggerDoubleTapLike = useCallback(
    async (storyId: string) => {
      // 1. Show subtle heart burst feedback animation
      setHeartBursts((prev) => ({ ...prev, [storyId]: true }));
      setTimeout(() => {
        setHeartBursts((prev) => ({ ...prev, [storyId]: false }));
      }, 750);

      // 2. Authoritative Like count toggle
      await toggleLike(storyId);
    },
    [toggleLike]
  );

  const handleContentClick = useCallback(
    (story: BroadcastSegment) => {
      const now = Date.now();
      const tracker = clickTrackerRef.current;

      // If clicked the same story within 280ms -> DOUBLE TAP
      if (tracker.storyId === story.id && now - tracker.timestamp < 280) {
        if (tracker.timer) {
          clearTimeout(tracker.timer);
          tracker.timer = null;
        }
        clickTrackerRef.current = { storyId: "", timestamp: 0, timer: null };
        void triggerDoubleTapLike(story.id);
        return;
      }

      // Otherwise -> SINGLE TAP (debounced by 280ms to permit double tap detection)
      if (tracker.timer) {
        clearTimeout(tracker.timer);
      }

      const timer = setTimeout(() => {
        handleSelectStoryOnTv(story);
        clickTrackerRef.current = { storyId: "", timestamp: 0, timer: null };
      }, 280);

      clickTrackerRef.current = {
        storyId: story.id,
        timestamp: now,
        timer,
      };
    },
    [handleSelectStoryOnTv, triggerDoubleTapLike]
  );

  const handleSelectAdOnTv = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("jdl_audio_unlocked", "1");
        if ("speechSynthesis" in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch {}

    dispatch({ type: "PLAY_AD" });
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
    void markRead(story.id);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const title = language === "hi" ? "ताज़ा खबरें" : "Latest News";

  return (
    <section className="jdl-mobile-queue" aria-label={title}>
      {/* Category Filter Tabs Bar */}
      <div
        className="jdl-category-tabs-bar"
        role="navigation"
        aria-label={language === "hi" ? "समाचार श्रेणियां" : "News Categories"}
      >
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
        {displayedStories.length === 0 ? (
          state.rawPool.length === 0 ? (
            /* Sleek skeleton placeholder while loading initial broadcast */
            <div className="jdl-mobile-queue__skeleton-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="jdl-mobile-queue__skeleton-card" />
              ))}
            </div>
          ) : (
            /* Category empty state */
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
          displayedStories.map((story, idx) => {
            const isActiveOnTv =
              activeStoryId === story.id || currentSegment?.id === story.id;
            const headline =
              language === "en"
                ? story.headlineEn || story.headline
                : story.headlineHi || story.headline;
            const rawDistrict =
              language === "en"
                ? story.districtEn || story.district
                : story.districtHi || story.district;
            const validDistrict =
              rawDistrict &&
              rawDistrict !== "छत्तीसगढ़" &&
              rawDistrict !== "Chhattisgarh"
                ? rawDistrict
                : null;
            const category =
              language === "en"
                ? story.categoryLabelEn || story.categoryLabel
                : story.categoryLabelHi || story.categoryLabel;
            const locationTag =
              validDistrict ||
              (category && category !== "छत्तीसगढ़" && category !== "Chhattisgarh"
                ? category
                : null) ||
              (language === "hi" ? "राज्य डेस्क" : "State Desk");
            const timeLabel = formatRelativeTime(story.publishedAt, language);
            const isConsumed = consumedIds.has(story.id);

            return (
              <React.Fragment key={story.id}>
                <article
                  className={`jdl-queue-card ${
                    isActiveOnTv ? "jdl-queue-card--tv-active" : ""
                  } ${isConsumed ? "jdl-queue-card--consumed" : ""}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const target = e.target as HTMLElement | null;
                      if (target && target.closest("button")) return;
                      e.preventDefault();
                      handleSelectStoryOnTv(story);
                    }
                  }}
                  aria-label={`${headline} — ${
                    language === "hi" ? "TV पर चलाएं" : "Play on TV"
                  }`}
                >
                  {/* UPPER SECTION: Thumbnail + Headline/Meta (Single tap = TV play, Double tap = Like) */}
                  <div
                    className="jdl-queue-card__main-content"
                    onClick={() => handleContentClick(story)}
                    role="button"
                    tabIndex={-1}
                  >
                    {/* Left: Thumbnail */}
                    <div
                      className="jdl-queue-card__thumb-wrap"
                      aria-hidden="true"
                    >
                      <QueueThumbnail src={story.imageUrl} alt="" />
                    </div>

                    {/* Right: Content Body */}
                    <div className="jdl-queue-card__body">
                      {/* District / Area Name + Time */}
                      <div className="jdl-queue-card__meta">
                        <span className="jdl-queue-card__tag">📍 {locationTag}</span>
                        {story.isBreaking && (
                          <span className="jdl-queue-card__breaking">
                            {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
                          </span>
                        )}
                        {isConsumed && (
                          <span className="jdl-queue-card__consumed-tag">
                            ✓ {language === "hi" ? "सुना गया" : "Consumed"}
                          </span>
                        )}
                        <span className="jdl-queue-card__time">{timeLabel}</span>
                      </div>

                      {/* Headline: maximum two lines */}
                      <h3 className="jdl-queue-card__headline" title={headline}>
                        {headline}
                      </h3>

                      {/* If actively playing on TV, show compact status chip */}
                      {isActiveOnTv && (
                        <div
                          className="jdl-queue-card__live-chip"
                          aria-label={
                            language === "hi"
                              ? "टीवी पर लाइव चल रहा है"
                              : "Live on TV"
                          }
                        >
                          <span
                            className="jdl-queue-card__pulse-dot"
                            aria-hidden="true"
                          />
                          <span>
                            {language === "hi" ? "टीवी पर लाइव" : "LIVE ON TV"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Instagram-like Double Tap Heart Feedback Overlay */}
                    {heartBursts[story.id] && (
                      <div
                        className="jdl-queue-card__heart-burst"
                        aria-hidden="true"
                      >
                        <HeartIcon filled={true} />
                      </div>
                    )}
                  </div>

                  {/* LOWER SECTION: FULL-WIDTH ENGAGEMENT ROW (Directly beneath image + headline) */}
                  {/* Exactly 5 actions: Like | Comment | Views | WhatsApp | पढ़ें */}
                  <CardEngagementRow
                    story={story}
                    headline={headline}
                    language={language}
                    engagement={engagementMap[story.id]}
                    onOpenArticle={handleOpenArticle}
                    onToggleLike={toggleLike}
                    onFetchComments={fetchComments}
                    onAddComment={addComment}
                  />
                </article>

                {/* Advertisement after every 3 news stories */}
                {(idx + 1) % 3 === 0 && (
                  <div
                    onClick={handleSelectAdOnTv}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectAdOnTv();
                      }
                    }}
                    style={{ width: "100%", cursor: "pointer" }}
                    aria-label="दुर्ग सोलर विज्ञापन — टीवी पर देखें"
                  >
                    <DurgSolarInlineAd
                      index={Math.floor((idx + 1) / 3)}
                      onBannerClick={() => {
                        handleSelectAdOnTv();
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </section>
  );
}
