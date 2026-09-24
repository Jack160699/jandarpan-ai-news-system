"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { NewsScreen } from "./NewsScreen";
import { BroadcastControlBar } from "./BroadcastControlBar";
import { useBroadcast } from "../BroadcastContext";
import { useBroadcastQueue } from "../useBroadcastQueue";
import { useBroadcastScript } from "../useBroadcastScript";
import { useAnchorVoice } from "../useAnchorVoice";
import { speechController } from "../speechController";

/**
 * Root Jan Darpan Live TV Studio Compositor.
 *
 * Professional 16:9 television newsroom broadcast:
 *   - Main story display: Dominant virtual broadcast screen on the left with clean single frame.
 *   - News anchor: Lower-right female anchor seamlessly integrated with the studio desk.
 *   - Channel bug: Approved official Jan Darpan logo + LIVE pill + IST clock in the upper-right.
 *   - Lower third: "मुख्य खबर" / "ब्रेकिंग न्यूज़" badge + prominent headline banner.
 *   - Unified control strip: [▶/⏸] [🔊/🔇] | 📍 District | Summary ticker.
 */
export function JanDarpanStudio({ embedded = false }: { embedded?: boolean }) {
  const { state, dispatch, setMuted, setPlaying } = useBroadcast();
  const {
    language,
    currentSegment,
    currentIndex,
    queue,
    mode,
    anchorState,
    isPlaying,
    isMuted,
    segmentToken,
  } = state;
  const { generateScript } = useBroadcastScript();
  const { speak, stop } = useAnchorVoice();
  useBroadcastQueue();

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const segmentTokenRef = useRef(segmentToken);
  segmentTokenRef.current = segmentToken;

  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes} IST`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pre-generate / cache scripts for current and next story
  useEffect(() => {
    if (!currentSegment) return;
    if (!currentSegment.script) {
      void generateScript(currentSegment);
    }
    // Preload next story script
    if (queue.length > 1) {
      const nextSeg = queue[(currentIndex + 1) % queue.length];
      if (nextSeg && !nextSeg.script) {
        void generateScript(nextSeg);
      }
    }
  }, [currentSegment?.id, currentSegment?.script, currentIndex, queue, generateScript]);

  // ─── UNIFIED BROADCAST RUNTIME ENGINE ─────────────────────────────────────
  // Deterministic state machine:
  // - PLAYING: speak story -> onEnd -> natural pause -> NEXT_SEGMENT
  // - PAUSED: immediately cancel speech, freeze all timers, keep current story visible
  // - MUTED: silent visual timer continues, advancing smoothly without sound
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      stop();
      return;
    }
    if (!currentSegment || !currentSegment.script) return;

    const token = segmentToken;
    let cancelled = false;
    let transitionTimer: ReturnType<typeof setTimeout> | null = null;
    let hardSafetyTimer: ReturnType<typeof setTimeout> | null = null;

    const isAccelerated =
      typeof window !== "undefined" &&
      !!(window as unknown as { __JD_TEST_ACCELERATED__?: boolean }).__JD_TEST_ACCELERATED__;

    const maxSafetyMs = isAccelerated ? 3000 : 28000;

    const advanceToNext = () => {
      if (
        !cancelled &&
        token === segmentTokenRef.current &&
        isPlayingRef.current &&
        !speechController.getIsPaused()
      ) {
        dispatch({ type: "NEXT_SEGMENT" });
      }
    };

    const runStoryCycle = async () => {
      dispatch({ type: "SET_STATUS", status: "playing" });

      // Armed hard safety timeout in case of unexpected hanging
      hardSafetyTimer = setTimeout(() => {
        advanceToNext();
      }, maxSafetyMs);

      try {
        await speak({
          script: currentSegment.script!,
          language,
          isBreaking: !!currentSegment.isBreaking,
          segmentToken: token,
        });
      } catch {}

      if (hardSafetyTimer) clearTimeout(hardSafetyTimer);

      // Natural anchor pause between stories (~450ms) before transitioning visuals
      if (
        !cancelled &&
        token === segmentTokenRef.current &&
        isPlayingRef.current &&
        !speechController.getIsPaused()
      ) {
        transitionTimer = setTimeout(() => {
          advanceToNext();
        }, isAccelerated ? 100 : 450);
      }
    };

    void runStoryCycle();

    return () => {
      cancelled = true;
      if (transitionTimer) clearTimeout(transitionTimer);
      if (hardSafetyTimer) clearTimeout(hardSafetyTimer);
    };
  }, [segmentToken, isPlaying, isMuted, language, currentSegment?.id, currentSegment?.script]);

  // Instrument broadcast runtime state for automated E2E testing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const nextStory = queue[(currentIndex + 1) % Math.max(1, queue.length)];
      (window as unknown as { __JD_BROADCAST_STATE__?: unknown }).__JD_BROADCAST_STATE__ = {
        currentIndex,
        currentStoryId: currentSegment?.id || "",
        nextStoryId: nextStory?.id || "",
        queueCount: queue.length,
        broadcastMode: mode,
        segmentToken,
        speechState: anchorState,
        playbackState: isPlaying ? "playing" : "paused",
        headline: currentSegment?.headline || "",
        district: currentSegment?.district || "",
        imageUrl: currentSegment?.imageUrl || "",
      };
    }
  }, [currentIndex, currentSegment, queue, mode, segmentToken, anchorState, isPlaying]);

  const currentHeadline =
    language === "hi"
      ? (currentSegment?.headlineHi || currentSegment?.headline || "")
      : (currentSegment?.headline || "");

  const isBreaking = mode === "breaking" || !!currentSegment?.isBreaking;

  return (
    <div
      className={`jdl-tv ${embedded ? "jdl-tv--embedded" : ""}`}
      aria-label={language === "hi" ? "जन दर्पण लाइव टेलीविज़न न्यूज़रूम" : "Jan Darpan Live Television Newsroom"}
    >
      {/* Hidden instrumentation container for automated E2E tests */}
      <div
        data-testid="jd-broadcast-instrumentation"
        data-current-index={currentIndex}
        data-current-id={currentSegment?.id || ""}
        data-next-id={queue[(currentIndex + 1) % Math.max(1, queue.length)]?.id || ""}
        data-queue-count={queue.length}
        data-mode={mode}
        data-segment-token={segmentToken}
        data-speech-state={anchorState}
        data-is-playing={isPlaying ? "true" : "false"}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* 16:9 Television Viewport */}
      <div className="jdl-tv__viewport">
        {/* Layer 1: Professional television newsroom studio background with seated female anchor */}
        <div className="jdl-tv__studio-bg" aria-hidden="true">
          <picture>
            <source srcSet="/jd-live/clean-studio-anchor.webp" type="image/webp" />
            <img
              src="/jd-live/clean-studio-anchor.jpg"
              alt=""
              className="jdl-tv__studio-img"
              loading="eager"
              decoding="async"
            />
          </picture>
        </div>

        {/* Layer 2: Main dynamic story screen (dominant virtual broadcast display on left) */}
        <div className="jdl-tv__screen-area">
          <NewsScreen />
        </div>

        {/* Layer 3: TV Channel Identity Bug (upper right corner) */}
        <div className="jdl-tv__corner-bug" aria-hidden="true">
          <div className="jdl-tv__bug-top">
            <Image
              src="/brand/jan-darpan/logo/compact-dark.svg"
              alt="Jan Darpan"
              width={100}
              height={22}
              priority
              className="jdl-tv__bug-logo-img"
            />
          </div>
          <div className="jdl-tv__bug-bottom">
            <div className="jdl-tv__bug-live-pill">
              <span className="jdl-tv__bug-dot" />
              <span>LIVE</span>
            </div>
            {currentTime && (
              <span className="jdl-tv__bug-time">{currentTime}</span>
            )}
          </div>
        </div>

        {/* Sound Unlock Prompt (Minimal, non-intrusive when muted by autoplay policy) */}
        {isMuted && isPlaying && (
          <button
            type="button"
            className="jdl-tv__sound-unlock"
            onClick={() => setMuted(false)}
            aria-label={language === "hi" ? "आवाज़ चालू करें" : "Turn on audio"}
          >
            <span className="jdl-tv__sound-unlock-icon" aria-hidden="true">🔊</span>
            <span>{language === "hi" ? "आवाज़ चालू करें" : "Tap for Sound"}</span>
          </button>
        )}

        {/* Center overlay play button if paused */}
        {!isPlaying && (
          <button
            type="button"
            className="jdl-tv__center-play"
            onClick={() => setPlaying(true)}
            aria-label={language === "hi" ? "प्रसारण जारी रखें" : "Resume Broadcast"}
          >
            <span className="jdl-tv__center-play-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4.5l14 7.5-14 7.5v-15z" />
              </svg>
            </span>
            <span>{language === "hi" ? "प्रसारण जारी रखें" : "Resume Broadcast"}</span>
          </button>
        )}

        {/* Layer 4: Lower-Third Headline Bar */}
        <div className="jdl-tv__lower-third" aria-live="polite">
          <div className={`jdl-tv__lt-badge ${isBreaking ? "jdl-tv__lt-badge--breaking" : ""}`}>
            <span>
              {isBreaking
                ? (language === "hi" ? "ब्रेकिंग न्यूज़" : "BREAKING")
                : (language === "hi" ? "मुख्य खबर" : "TOP STORY")}
            </span>
          </div>
          <div className="jdl-tv__lt-headline-wrap">
            <h2 className="jdl-tv__lt-headline">{currentHeadline}</h2>
            <div className="jdl-tv__lt-accent-edge" />
          </div>
        </div>
      </div>

      {/* Layer 5: Docked television control strip & ticker */}
      <div className="jdl-tv__bar-wrap">
        <BroadcastControlBar />
      </div>
    </div>
  );
}
