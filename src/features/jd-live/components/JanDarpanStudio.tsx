"use client";

import React, { useEffect, useCallback } from "react";
import Image from "next/image";
import { AnchorFigure } from "./AnchorFigure";
import { NewsScreen } from "./NewsScreen";
import { TopTenPanel } from "./TopTenPanel";
import { LowerThird } from "./LowerThird";
import { BreakingBanner } from "./BreakingBanner";
import { BroadcastTicker } from "./BroadcastTicker";
import { LiveIndicator } from "./LiveIndicator";
import { MobileBroadcastLayout } from "./MobileBroadcastLayout";
import { useBroadcast } from "../BroadcastContext";
import { useBroadcastQueue } from "../useBroadcastQueue";
import { useBroadcastScript } from "../useBroadcastScript";
import { useAnchorVoice } from "../useAnchorVoice";

/**
 * Root Jan Darpan Live studio compositor.
 * Orchestrates the full broadcast loop:
 *   load queue → generate script → play TTS → advance segment → repeat
 */
export function JanDarpanStudio({ embedded = false }: { embedded?: boolean }) {
  const { state, dispatch, setLanguage } = useBroadcast();
  const { language, currentSegment, status, scriptReady } = state;
  const { advanceAfterSegment } = useBroadcastQueue();
  const { generateScript } = useBroadcastScript();
  const { speak, stop } = useAnchorVoice();

  // Generate script whenever a new segment is loaded
  useEffect(() => {
    if (!currentSegment || status !== "loading") return;
    dispatch({ type: "SET_STATUS", status: "playing" });
    void generateScript(currentSegment);
  }, [currentSegment?.id, status, generateScript, dispatch]);

  // Speak when script is ready
  useEffect(() => {
    if (!currentSegment || !scriptReady || !currentSegment.script) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const durationMs = await speak({
        script: currentSegment.script!,
        language,
        ttsPath: currentSegment.ttsPath,
      });
      // Advance 1s after speech ends
      timer = advanceAfterSegment(durationMs + 1000);
    };
    void run();

    return () => {
      stop();
      if (timer) clearTimeout(timer);
    };
    // Only re-run when segment changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSegment?.id, scriptReady]);

  const brandName = language === "hi" ? "जन दर्पण" : "JAN DARPAN";
  const tagline = language === "hi" ? "छत्तीसगढ़ की बात, आपके साथ" : "Chhattisgarh's Voice";

  return (
    <>
      {/* Desktop layout */}
      <div
        className={`jdl-studio ${embedded ? "jdl-studio--embedded" : ""}`}
        aria-label="Jan Darpan Live Studio"
      >
        {/* Studio background */}
        <div className="jdl-studio__bg" aria-hidden>
          <Image
            src="/jd-live/studio-bg.jpg"
            alt=""
            fill
            priority
            quality={90}
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
          <div className="jdl-studio__bg-overlay" />
        </div>

        {/* Top bar */}
        <div className="jdl-studio__topbar">
          <div className="jdl-studio__brand">
            <div className="jdl-studio__logo-mark" aria-hidden>
              <span className="jdl-studio__logo-circle" />
              <span className="jdl-studio__logo-dash" />
            </div>
            <div>
              <div className="jdl-studio__brand-name">{brandName}</div>
              <div className="jdl-studio__tagline">{tagline}</div>
            </div>
          </div>

          {/* Language switcher */}
          <div className="jdl-studio__lang-sw">
            <button
              className={`jdl-studio__lang-btn ${language === "hi" ? "jdl-studio__lang-btn--active" : ""}`}
              onClick={() => setLanguage("hi")}
              aria-pressed={language === "hi"}
            >
              हि
            </button>
            <button
              className={`jdl-studio__lang-btn ${language === "en" ? "jdl-studio__lang-btn--active" : ""}`}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
          </div>

          <LiveIndicator />
        </div>

        {/* Main composition area */}
        <div className="jdl-studio__main">
          {/* Left: anchor + news screen */}
          <div className="jdl-studio__left">
            {/* Large news screen (above anchor or beside) */}
            <div className="jdl-studio__screen-wrap">
              <NewsScreen />
            </div>

            {/* Anchor seated at desk */}
            <div className="jdl-studio__anchor-wrap">
              <AnchorFigure />
            </div>
          </div>

          {/* Right: Top 10 panel */}
          <div className="jdl-studio__right">
            <TopTenPanel />
          </div>
        </div>

        {/* Graphics zone: lower-third or breaking */}
        <div className="jdl-studio__graphics">
          <LowerThird />
          <BreakingBanner />
        </div>

        {/* Bottom ticker */}
        <div className="jdl-studio__ticker">
          <BroadcastTicker />
        </div>

        {/* Loading state overlay */}
        {status === "initializing" && (
          <div className="jdl-studio__loading" aria-live="polite">
            <div className="jdl-studio__loading-spinner" aria-hidden />
            <p>{language === "hi" ? "जन दर्पण लाइव लोड हो रहा है…" : "Loading Jan Darpan Live…"}</p>
          </div>
        )}
      </div>

      {/* Mobile layout (hidden on desktop, shown on mobile via CSS) */}
      <div className={`jdl-studio-mobile-wrap ${embedded ? "jdl-studio-mobile-wrap--embedded" : ""}`}>
        <MobileBroadcastLayout embedded={embedded} />
      </div>
    </>
  );
}
