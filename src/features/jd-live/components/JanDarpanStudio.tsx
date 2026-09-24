"use client";

import React, { useEffect } from "react";
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
  } = state;
  const { advanceAfterSegment } = useBroadcastQueue();
  const { generateScript } = useBroadcastScript();
  const { speak, stop } = useAnchorVoice();

  // Generate script whenever a new segment is loaded
  useEffect(() => {
    if (!currentSegment || status !== "loading") return;
    dispatch({ type: "SET_STATUS", status: "playing" });
    void generateScript(currentSegment);
  }, [currentSegment?.id, status, generateScript, dispatch]);

  // Speech and auto-advance playback loop
  useEffect(() => {
    if (!isPlaying) {
      stop();
      return;
    }
    if (!currentSegment || !scriptReady || !currentSegment.script) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const durationMs = await speak({
        script: currentSegment.script!,
        language,
        ttsPath: currentSegment.ttsPath,
        isIntro: !!currentSegment.isIntro,
        countdownRank: currentSegment.countdownRank,
        isBreaking: !!currentSegment.isBreaking,
      });
      // Advance to next segment after speech / visual duration
      timer = advanceAfterSegment(durationMs + 1000);
    };
    void run();

    return () => {
      stop();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSegment?.id, scriptReady, isPlaying, isMuted, language]);

  return (
    <div
      className={`jdl-tv ${embedded ? "jdl-tv--embedded" : ""}`}
      aria-label={language === "hi" ? "जन दर्पण लाइव टेलीविज़न न्यूज़रूम" : "Jan Darpan Live Television Newsroom"}
    >
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

          {/* Television broadcast bug / watermark (top-left) */}
          <div className="jdl-tv__watermark" aria-hidden>
            <span className="jdl-tv__live-dot" />
            <span className="jdl-tv__watermark-text">
              {language === "hi" ? "जन दर्पण लाइव" : "JAN DARPAN LIVE"}
            </span>
          </div>

          {/* Center overlay play button if paused */}
          {!isPlaying && (
            <button
              type="button"
              className="jdl-tv__center-play"
              onClick={() => dispatch({ type: "SET_PLAYING", isPlaying: true })}
              aria-label={language === "hi" ? "प्रसारण शुरू करें" : "Start Broadcast"}
            >
              <span className="jdl-tv__center-play-icon" aria-hidden>▶</span>
              <span>{language === "hi" ? "प्रसारण शुरू करें" : "Resume Broadcast"}</span>
            </button>
          )}

          {/* Dynamic News Screen overlay — fitted over the studio wall video monitor */}
          <div className="jdl-tv__screen-area">
            <NewsScreen />
          </div>

          {/* Broadcast graphics zone: Lower Third or Breaking News banner */}
          <div className="jdl-tv__graphics">
            <LowerThird />
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

      {/* Loading state overlay */}
      {status === "initializing" && (
        <div className="jdl-studio__loading" aria-live="polite">
          <div className="jdl-studio__loading-spinner" aria-hidden />
          <p>{language === "hi" ? "जन दर्पण लाइव लोड हो रहा है…" : "Loading Jan Darpan Live…"}</p>
        </div>
      )}
    </div>
  );
}
