"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { NewsScreen } from "./NewsScreen";
import { TopTenPanel } from "./TopTenPanel";
import { LowerThird } from "./LowerThird";
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
    const maxDuration = isIntro ? 8_000 : isBreaking ? 20_000 : 30_000;

    const id = setTimeout(() => {
      if (token === segmentTokenRef.current && isPlayingRef.current) {
        dispatch({ type: "NEXT_SEGMENT" });
      }
    }, maxDuration);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentToken, isPlaying, currentSegment?.script]);

  return (
    <div
      className={`jdl-tv ${embedded ? "jdl-tv--embedded" : ""}`}
      aria-label={language === "hi" ? "जन दर्पण लाइव टेलीविज़न न्यूज़रूम" : "Jan Darpan Live Television Newsroom"}
    >
      {/* Studio */}
      <div className="jdl-studio">
        {/* LIVE badge */}
        <div className="jdl-studio__live-bug">
          <span className="jdl-studio__live-dot" />
          {language === "hi" ? "जन दर्पण लाइव" : "Jan Darpan Live"}
        </div>

        {/* Anchor */}
        <div className="jdl-studio__anchor-wrapper">
          <Image
            src="/jd-live/anchor-female.png"
            alt="Jan Darpan Anchor"
            width={520}
            height={520}
            priority
            className="jdl-studio__anchor"
            style={{ objectFit: "contain" }}
          />
          {/* Lip-sync indicator */}
          {state.anchorState === "speaking" && (
            <div
              className="jdl-studio__speak-indicator"
              style={{ opacity: state.amplitude * 0.6 + 0.4 }}
            />
          )}
        </div>

        {/* Studio monitor showing current story */}
        <NewsScreen />

        {/* Jan Darpan studio branding */}
        <div className="jdl-studio__brand">
          <Image
            src="/jd-live/jd-logo-white.svg"
            alt="Jan Darpan"
            width={100}
            height={30}
            className="jdl-studio__logo"
          />
        </div>
      </div>

      {/* Lower Third / Breaking */}
      {state.mode === "breaking" && currentSegment?.isBreaking ? (
        <BreakingBanner />
      ) : (
        <LowerThird />
      )}

      {/* Controls */}
      <BroadcastControlBar />

      {/* Desktop Top 10 */}
      <TopTenPanel />
    </div>
  );
}
