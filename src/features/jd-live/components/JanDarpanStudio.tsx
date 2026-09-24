"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { NewsScreen } from "./NewsScreen";
import { BroadcastControlBar } from "./BroadcastControlBar";
import { useBroadcast } from "../BroadcastContext";
import { useBroadcastQueue } from "../useBroadcastQueue";
import { useBroadcastScript } from "../useBroadcastScript";
import { useAnchorVoice } from "../useAnchorVoice";

/**
 * Root Jan Darpan Live TV Studio Compositor.
 *
 * Implements the broadcast standard 16:9 television newsroom:
 *   - Story media star: 70% dynamic monitor screen on the left.
 *   - News anchor: Seated female anchor in navy blazer at news desk on the right.
 *   - Channel bug: Top-right corner bug with emblem, "जन दर्पण", LIVE pill, and IST clock.
 *   - Lower third: Angled "मुख्य खबर" badge + connected headline banner.
 *   - Unified bottom bar: [▶/⏸] [🔊/🔇] | 📍 District | Summary.
 */
export function JanDarpanStudio({ embedded = false }: { embedded?: boolean }) {
  const { state, dispatch } = useBroadcast();
  const {
    language,
    currentSegment,
    currentIndex,
    queue,
    mode,
    anchorState,
    status,
    scriptReady,
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

  // Generate script whenever a new segment is loaded if not already present
  useEffect(() => {
    if (!currentSegment) return;
    if (!currentSegment.script) {
      dispatch({ type: "SET_STATUS", status: "loading" });
      void generateScript(currentSegment);
    }
  }, [currentSegment?.id, currentSegment?.script, generateScript, dispatch]);

  // ─── CORE BROADCAST ENGINE ───────────────────────────────────────────────
  // Two independent mechanisms guarantee continuous story advancement:
  // 1. speak() → resolve → NEXT_SEGMENT  (normal path)
  // 2. Deterministic timer → NEXT_SEGMENT (safety net, fires at max segment duration)
  // ──────────────────────────────────────────────────────────────────────────

  // Mechanism 1: Speak the story, then advance
  useEffect(() => {
    if (!isPlaying) {
      stop();
      return;
    }
    if (!currentSegment || !currentSegment.script) return;

    const token = segmentToken;
    let cancelled = false;

    const runBroadcast = async () => {
      dispatch({ type: "SET_STATUS", status: "playing" });
      try {
        await speak({
          script: currentSegment.script!,
          language,
          ttsPath: currentSegment.ttsPath,
          isIntro: !!currentSegment.isIntro,
          countdownRank: currentSegment.countdownRank,
          isBreaking: !!currentSegment.isBreaking,
          segmentToken: token,
        });
      } catch {
        // speech failed — safety timer handles advancement
      }

      // Advance if this segment is still current
      if (!cancelled && token === segmentTokenRef.current && isPlayingRef.current) {
        dispatch({ type: "NEXT_SEGMENT" });
      }
    };

    void runBroadcast();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentToken, isPlaying, language, currentSegment?.script]);

  // Mechanism 2: Hard safety timer — force advance after max segment duration
  useEffect(() => {
    if (!isPlaying || !currentSegment?.script) return;
    const token = segmentToken;

    const isIntro = currentSegment.isIntro;
    const isBreaking = currentSegment.isBreaking;
    const isAccelerated =
      typeof window !== "undefined" &&
      !!(window as unknown as { __JD_TEST_ACCELERATED__?: boolean }).__JD_TEST_ACCELERATED__;
    const maxDuration = isAccelerated ? 3_500 : (isIntro ? 8_000 : isBreaking ? 20_000 : 30_000);

    const id = setTimeout(() => {
      if (token === segmentTokenRef.current && isPlayingRef.current) {
        dispatch({ type: "NEXT_SEGMENT" });
      }
    }, maxDuration);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentToken, isPlaying, currentSegment?.script]);

  // Instrument broadcast runtime state for automated E2E testing and diagnostics
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
        {/* Layer 1: Dynamic story media screen (sits inside the TV monitor cutout) */}
        <div className="jdl-tv__screen-area">
          <NewsScreen />
        </div>

        {/* Layer 2: Master Studio Plate Cutout with metallic bezel, female anchor on lower right, newsroom on right, and desk */}
        <div className="jdl-tv__studio-overlay" aria-hidden="true">
          <Image
            src="/jd-live/studio-plate-cutout.png"
            alt=""
            fill
            priority
            quality={92}
            sizes="(max-width: 900px) 100vw, 1100px"
            style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none" }}
          />
        </div>

        {/* Layer 3: TV Channel Identity Bug (upper right) */}
        <div className="jdl-tv__corner-bug" aria-hidden="true">
          <div className="jdl-tv__bug-top">
            <div className="jdl-tv__bug-emblem">
              <svg viewBox="0 0 100 100" width="20" height="20">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A24B" strokeWidth="4" opacity="0.75" />
                <circle cx="50" cy="38" r="8" fill="#C9A24B" />
                <path d="M22 56 A28 28 0 0 1 78 56 Z" fill="#C8102E" />
                <rect x="18" y="54" width="64" height="3.5" rx="1.75" fill="#C9A24B" />
              </svg>
            </div>
            <div className="jdl-tv__bug-text">
              <span className="jdl-tv__bug-title">{language === "hi" ? "जन दर्पण" : "JAN DARPAN"}</span>
              <span className="jdl-tv__bug-subtitle">{language === "hi" ? "छत्तीसगढ़ की आवाज़" : "Voice of Chhattisgarh"}</span>
            </div>
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

        {/* Center overlay play button if paused */}
        {!isPlaying && (
          <button
            type="button"
            className="jdl-tv__center-play"
            onClick={() => dispatch({ type: "SET_PLAYING", isPlaying: true })}
            aria-label={language === "hi" ? "प्रसारण शुरू करें" : "Start Broadcast"}
          >
            <span className="jdl-tv__center-play-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4.5l14 7.5-14 7.5v-15z" />
              </svg>
            </span>
            <span>{language === "hi" ? "प्रसारण शुरू करें" : "Resume Broadcast"}</span>
          </button>
        )}

        {/* Layer 4: Lower-Third Headline Bar (matches reference image) */}
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
