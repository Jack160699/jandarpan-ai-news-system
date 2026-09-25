"use client";

import React, { useEffect, useRef, useState } from "react";
import { NewsScreen } from "./NewsScreen";
import { BroadcastControlBar } from "./BroadcastControlBar";
import { useBroadcast } from "../BroadcastContext";
import { useBroadcastQueue } from "../useBroadcastQueue";
import { useBroadcastScript } from "../useBroadcastScript";
import { useAnchorVoice } from "../useAnchorVoice";
import { speechController } from "../speechController";

/**
 * TeleprompterReadingStrip — Live broadcast synchronized reading strip.
 *
 * Rules:
 * - Displays the full story broadcast narration text beside "मुख्य खबर".
 * - Utilizes 100% of the available TV width without leaving it empty.
 * - Scrolls in synchronization with anchor narration duration.
 * - Freezes immediately when broadcast is paused; resumes when playing.
 * - Resets smoothly when story switches.
 */
function TeleprompterReadingStrip({
  text,
  isPlaying,
  durationSec,
}: {
  text: string;
  isPlaying: boolean;
  durationSec: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [scrollDist, setScrollDist] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current && textRef.current) {
        const containerW = containerRef.current.clientWidth;
        const textW = textRef.current.scrollWidth;
        if (textW > containerW + 4) {
          setScrollDist(textW - containerW + 32);
        } else {
          setScrollDist(0);
        }
      }
    };
    measure();
    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [text]);

  const isOverflowing = scrollDist > 0;
  // Calibrate reading strip to anchor speech delivery: rate 0.94 averages ~9.8 chars/sec
  const naturalSpokenSec = Math.max(16, Math.ceil(text.length / 9.8));
  const effectiveDuration = Math.max(durationSec || 0, naturalSpokenSec);

  return (
    <div ref={containerRef} className="jdl-tv__lt-headline-wrap">
      <div
        ref={textRef}
        key={text}
        className={`jdl-tv__lt-headline ${isOverflowing ? "jdl-tv__lt-headline--marquee" : ""}`}
        style={
          isOverflowing
            ? ({
                "--marquee-dist": `-${scrollDist}px`,
                "--marquee-duration": `${effectiveDuration}s`,
                animationPlayState: isPlaying ? "running" : "paused",
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </div>
    </div>
  );
}

/**
 * Root Jan Darpan Live TV Studio Compositor.
 *
 * Professional 16:9 television newsroom broadcast:
 *   - Main story visual: Dominant virtual broadcast screen occupying the left/dominant area.
 *   - News anchor: Lower-right female anchor seamlessly integrated with the studio desk.
 *   - NO corner bug / LIVE+time overlay (space reserved cleanly for the anchor).
 *   - Full-width lower third: RED "मुख्य खबर" badge + WHITE / contrasted full-width headline with marquee.
 *   - Control row directly below: [Pause] [Mute] [ DURG SOLAR AD ] [Share] [WhatsApp].
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

  const lastToggleRef = useRef(0);
  const [copied, setCopied] = useState(false);

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

  const getStoryUrl = () => {
    if (typeof window === "undefined") return "https://www.jandarpan.news";
    return currentSegment?.slug
      ? `${window.location.origin}/story/${currentSegment.slug}`
      : window.location.href;
  };

  // TV Viewport Tap Toggle: Playing -> Paused, Paused -> Resumed
  const handleTvClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest("button") || target.closest("a"))) {
      return;
    }
    const now = Date.now();
    if (now - lastToggleRef.current < 350) return;
    lastToggleRef.current = now;
    setPlaying(!isPlaying);
  };

  // Dedicated Resume Action inside Paused Overlay
  const handleResume = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastToggleRef.current < 350) return;
    lastToggleRef.current = now;
    setPlaying(true);
  };

  // Share current story inside Paused Overlay (does NOT resume playback)
  const handleShare = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const url = getStoryUrl();
    const title = currentHeadline || "Jan Darpan Live";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: title,
          url,
        });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  // WhatsApp current story inside Paused Overlay (does NOT resume playback)
  const handleWhatsApp = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const url = getStoryUrl();
    const text = encodeURIComponent(
      `नमस्ते Jan Darpan, मैं यह लाइव समाचार देख रहा हूँ:\n\n*${currentHeadline}*\n${url}`
    );
    const waUrl = `https://wa.me/919584735857?text=${text}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

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

      {/* 16:9 Television Viewport — Direct Tap to Pause/Resume */}
      <div
        className="jdl-tv__viewport"
        onClick={handleTvClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            const target = e.target as HTMLElement | null;
            if (target && (target.closest("button") || target.closest("a"))) return;
            e.preventDefault();
            setPlaying(!isPlaying);
          }
        }}
        aria-label={
          isPlaying
            ? (language === "hi" ? "टेलीविज़न रोकें (टैप करें)" : "Pause Live TV (Tap anywhere)")
            : (language === "hi" ? "टेलीविज़न जारी रखें (टैप करें)" : "Resume Live TV (Tap anywhere)")
        }
      >
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

        {/* Layer 1.5: Channel Bug / Logo in upper-right */}
        <div className="jdl-tv__channel-bug" aria-hidden="true">
          <span className="jdl-tv__channel-bug-dot" />
          <span className="jdl-tv__channel-bug-name">जन दर्पण</span>
          <span className="jdl-tv__channel-bug-tag">LIVE</span>
        </div>

        {/* Layer 2: Main dynamic story screen (dominant virtual broadcast display on left) */}
        <div className="jdl-tv__screen-area">
          <NewsScreen />
        </div>

        {/* Sound Unlock Prompt (Minimal, non-intrusive when muted by autoplay policy) */}
        {isMuted && isPlaying && (
          <button
            type="button"
            className="jdl-tv__sound-unlock"
            onClick={(e) => {
              e.stopPropagation();
              setMuted(false);
            }}
            aria-label={language === "hi" ? "आवाज़ चालू करें" : "Turn on audio"}
          >
            <span className="jdl-tv__sound-unlock-icon" aria-hidden="true">🔊</span>
            <span>{language === "hi" ? "आवाज़ चालू करें" : "Tap for Sound"}</span>
          </button>
        )}

        {/* Layer 2.5: Lightweight Paused Control Overlay inside TV (Centered on story screen, clear of anchor) */}
        {!isPlaying && (
          <div
            className="jdl-tv__paused-overlay"
            data-testid="jdl-tv-paused-overlay"
            role="region"
            aria-label="Paused broadcast controls"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clear PAUSED Indicator */}
            <div className="jdl-tv__paused-badge">
              <span className="jdl-tv__paused-pulse" aria-hidden="true" />
              <span className="jdl-tv__paused-label">
                {language === "hi" ? "रोक दिया गया" : "PAUSED"}
              </span>
            </div>

            {/* Interactive Control Row */}
            <div className="jdl-tv__paused-actions">
              {/* ▶ Resume */}
              <button
                type="button"
                className="jdl-tv__paused-btn jdl-tv__paused-btn--resume"
                onClick={handleResume}
                aria-label={language === "hi" ? "प्रसारण जारी रखें" : "Resume broadcast"}
                title={language === "hi" ? "जारी रखें" : "Resume"}
                data-testid="jdl-tv-resume-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 4.5l14 7.5-14 7.5v-15z" />
                </svg>
                <span>{language === "hi" ? "जारी रखें" : "Resume"}</span>
              </button>

              {/* Share */}
              <button
                type="button"
                className="jdl-tv__paused-btn jdl-tv__paused-btn--share"
                onClick={handleShare}
                aria-label={language === "hi" ? "वर्तमान खबर साझा करें" : "Share current story"}
                title={copied ? "Copied!" : "Share current story"}
                data-testid="jdl-tv-share-btn"
              >
                {copied ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ color: "#4ade80" }}>{language === "hi" ? "कॉपी हुआ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{language === "hi" ? "साझा करें" : "Share"}</span>
                  </>
                )}
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                className="jdl-tv__paused-btn jdl-tv__paused-btn--whatsapp"
                onClick={handleWhatsApp}
                aria-label={language === "hi" ? "व्हाट्सएप पर साझा करें" : "Share current story on WhatsApp"}
                title="Share on WhatsApp"
                data-testid="jdl-tv-whatsapp-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3" />
                </svg>
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Layer 3: Lower-Third Headline Bar (Full available width, no duplicate headline below) */}
        <div className="jdl-tv__lower-third" aria-live="polite">
          <div className={`jdl-tv__lt-badge ${isBreaking ? "jdl-tv__lt-badge--breaking" : ""}`}>
            <span>
              {isBreaking
                ? (language === "hi" ? "ब्रेकिंग न्यूज़" : "BREAKING")
                : (language === "hi" ? "मुख्य खबर" : "TOP STORY")}
            </span>
          </div>
          <TeleprompterReadingStrip
            text={
              currentSegment?.script ||
              (currentHeadline
                ? `${currentHeadline} — ${currentSegment?.summary || ""}`
                : "")
            }
            isPlaying={isPlaying}
            durationSec={currentSegment?.durationSec || 16}
          />
        </div>
      </div>

      {/* Control / Advertisement Row directly below the main headline */}
      <div className="jdl-tv__bar-wrap">
        <BroadcastControlBar />
      </div>
    </div>
  );
}
