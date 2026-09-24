"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { NewsScreen } from "./NewsScreen";
import { TopTenPanel } from "./TopTenPanel";
import { BreakingBanner } from "./BreakingBanner";
import { BroadcastControlBar } from "./BroadcastControlBar";
import { useBroadcast } from "../BroadcastContext";
import { useBroadcastQueue } from "../useBroadcastQueue";
import { useBroadcastScript } from "../useBroadcastScript";
import { useAnchorVoice } from "../useAnchorVoice";

/**
 * Root Jan Darpan Live TV Studio Compositor.
 *
 * Designed as a coherent 16:9 television broadcast experience on both desktop and mobile:
 *   - Master studio plate: Anchor seated naturally at news desk with Jan Darpan identity and lighting.
 *   - Dynamic studio monitor: Active story visual, headline, location, and breaking status.
 *   - Top 10 panel: Visible on desktop, completely hidden on mobile.
 *   - Broadcast graphics: Lower-third / breaking overlay and live bug.
 *   - Bottom control bar: Touch-friendly Play/Pause, Mute/Unmute, Live indicator, and scrolling ticker.
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

  // Generate script whenever a new segment is loaded
  useEffect(() => {
    if (!currentSegment) return;
    if (!currentSegment.script) {
      dispatch({ type: "SET_STATUS", status: "loading" });
      void generateScript(currentSegment);
    }
  }, [currentSegment?.id, currentSegment?.script, generateScript, dispatch]);

  // ─── CORE BROADCAST ENGINE ───────────────────────────────────────────────
  // Two independent mechanisms guarantee story advancement:
  //
  // 1. speak() → resolve → NEXT_SEGMENT  (normal path)
  // 2. Deterministic timer → NEXT_SEGMENT (safety net, fires at max segment duration)
  //
  // This ensures the broadcast NEVER freezes regardless of speech API behavior.
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
  // This fires independently of speak() and guarantees the broadcast progresses
  // even if speech synthesis hangs, Promise never resolves, or any other failure.
  useEffect(() => {
    if (!isPlaying || !currentSegment?.script) return;
    const token = segmentToken;

    // Calculate max duration: intro=8s, breaking=15s, normal=25s, +5s buffer
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

  // Instrument broadcast runtime state for E2E testing and diagnostics
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
      {/* Television Viewport — 16:9 Landscape Broadcast on Desktop & Mobile */}
      <div className="jdl-tv__viewport">
        {/* Main Broadcast Zone (Anchor, Monitor, Watermark, Lower Third, Breaking Banner) */}
        <div className="jdl-tv__broadcast-area">
          {/* Master Studio Plate: photorealistic studio background with seated anchor and desk */}
          <div className="jdl-tv__bg" aria-hidden>
            <Image
              src="/jd-live/master-studio.jpg"
              alt=""
              fill
              priority
              quality={90}
              sizes="(max-width: 900px) 100vw, 1100px"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>

          {/* TV Channel Identity Corner Bug (upper-right) */}
          <div className="jdl-tv__corner-bug" aria-hidden>
            <div className="jdl-tv__bug-top">
              <span className="jdl-tv__bug-dot" />
              <Image
                src="/brand/jan-darpan/logo/compact-dark.svg"
                alt="Jan Darpan"
                width={86}
                height={18}
                className="jdl-tv__bug-logo"
                priority
              />
            </div>
            {currentTime && (
              <div className="jdl-tv__bug-time">{currentTime}</div>
            )}
          </div>

          {/* Center overlay play button if paused */}
          {!isPlaying && (
            <button
              type="button"
              className="jdl-tv__center-play"
              onClick={() => dispatch({ type: "SET_PLAYING", isPlaying: true })}
              aria-label={language === "hi" ? "प्रसारण शुरू करें" : "Start Broadcast"}
            >
              <span className="jdl-tv__center-play-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4.5l14 7.5-14 7.5v-15z" />
                </svg>
              </span>
              <span>{language === "hi" ? "प्रसारण शुरू करें" : "Resume Broadcast"}</span>
            </button>
          )}

          {/* Dynamic News Screen overlay — fitted over the studio wall video monitor */}
          <div className="jdl-tv__screen-area">
            <NewsScreen />
          </div>

          {/* Broadcast graphics zone: Breaking News alert overlay if breaking */}
          <div className="jdl-tv__graphics">
            <BreakingBanner />
          </div>
        </div>

        {/* Top 10 Stories Panel — visible on desktop, hidden on mobile */}
        <div className="jdl-tv__top10-area">
          <TopTenPanel />
        </div>
      </div>

      {/* Docked television control strip & ticker */}
      <div className="jdl-tv__bar-wrap">
        <BroadcastControlBar />
      </div>
    </div>
  );
}
