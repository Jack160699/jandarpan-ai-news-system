"use client";

import React, { useEffect, useRef, useState } from "react";
import { NewsScreen } from "./NewsScreen";
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

    // Generous dead-man fallback (min 90s) in case browser speech engine crashes
    const scriptLen = currentSegment.script?.length || 100;
    const deadManSafetyMs = isAccelerated ? 3000 : Math.max(90000, scriptLen * 180);

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

      // Armed dead-man safety timeout only in case of complete browser failure
      hardSafetyTimer = setTimeout(() => {
        advanceToNext();
      }, deadManSafetyMs);

      try {
        await speak({
          script: currentSegment.script!,
          language,
          isBreaking: !!currentSegment.isBreaking,
          segmentToken: token,
        });
      } catch {}

      if (hardSafetyTimer) {
        clearTimeout(hardSafetyTimer);
        hardSafetyTimer = null;
      }

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
    language === "en"
      ? (currentSegment?.headlineEn || currentSegment?.headline || "")
      : (currentSegment?.headlineHi || currentSegment?.headline || "");

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

  // Mute / Unmute toggle inside Paused Overlay (does NOT alter playback state)
  const handleToggleMute = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setMuted(!isMuted);
  };

  // Share current story inside Paused Overlay (does NOT alter playback state)
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

  // WhatsApp current story inside Paused Overlay (does NOT alter playback state)
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
        data-is-muted={isMuted ? "true" : "false"}
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

        {/* Layer 1.5: Channel Watermark in upper-right — ONLY official Jan Darpan logo icon */}
        <div className="jdl-tv__channel-watermark" aria-hidden="true">
          <svg
            viewBox="0 0 100 100"
            className="jdl-tv__channel-watermark-icon"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A24B" strokeWidth="1.8" opacity="0.65" />
            <circle cx="50" cy="38" r="6.5" fill="#C9A24B" />
            <path d="M22 54 A28 28 0 0 1 78 54 Z" fill="#C8102E" />
            <rect x="18.5" y="52.4" width="63" height="2.8" rx="1.4" fill="#C9A24B" />
            <path d="M25 57 A25 25 0 0 0 75 57 Z" fill="#C8102E" opacity="0.28" />
          </svg>
        </div>

        {/* Layer 2: Main dynamic story screen (dominant virtual broadcast display on left) */}
        <div className="jdl-tv__screen-area">
          <NewsScreen />
        </div>

        {/* Dedicated Audio Control in LOWER-LEFT OF THE TV (Immediately above मुख्य खबर strip) */}
        <button
          type="button"
          className={`jdl-tv__audio-btn ${isMuted ? "jdl-tv__audio-btn--muted" : "jdl-tv__audio-btn--active"}`}
          onClick={(e) => {
            e.stopPropagation();
            setMuted(!isMuted);
          }}
          aria-label={
            isMuted
              ? (language === "hi" ? "आवाज़ चालू करें" : "Unmute broadcast")
              : (language === "hi" ? "म्यूट करें" : "Mute broadcast")
          }
          title={isMuted ? "Unmute" : "Mute"}
          data-testid="jdl-lower-left-audio-btn"
        >
          {isMuted ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              <span className="jdl-tv__audio-btn-text">
                {language === "hi" ? "आवाज़ चालू करें" : "Tap to unmute"}
              </span>
            </>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        {/* Layer 2.5: CENTERED ICON-ONLY CONTROLS INSIDE TV WHEN PAUSED */}
        {!isPlaying && (
          <div
            className="jdl-tv__center-controls"
            data-testid="jdl-tv-center-controls"
            role="region"
            aria-label="Broadcast controls"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Play / Resume Icon */}
            <button
              type="button"
              className="jdl-tv__icon-btn jdl-tv__icon-btn--play"
              onClick={handleResume}
              aria-label={language === "hi" ? "प्रसारण जारी रखें" : "Resume broadcast"}
              title="Resume"
              data-testid="jdl-center-play-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 4.5l14 7.5-14 7.5v-15z" />
              </svg>
            </button>

            {/* Mute / Unmute Icon */}
            <button
              type="button"
              className={`jdl-tv__icon-btn jdl-tv__icon-btn--mute ${isMuted ? "jdl-tv__icon-btn--muted" : ""}`}
              onClick={handleToggleMute}
              aria-label={
                isMuted
                  ? (language === "hi" ? "आवाज़ चालू करें" : "Unmute audio")
                  : (language === "hi" ? "म्यूट करें" : "Mute audio")
              }
              title={isMuted ? "Unmute" : "Mute"}
              data-testid="jdl-center-mute-btn"
            >
              {isMuted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {/* Share Icon */}
            <button
              type="button"
              className="jdl-tv__icon-btn jdl-tv__icon-btn--share"
              onClick={handleShare}
              aria-label={language === "hi" ? "साझा करें" : "Share current story"}
              title="Share"
              data-testid="jdl-center-share-btn"
            >
              {copied ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              )}
            </button>

            {/* WhatsApp Icon */}
            <button
              type="button"
              className="jdl-tv__icon-btn jdl-tv__icon-btn--whatsapp"
              onClick={handleWhatsApp}
              aria-label={language === "hi" ? "व्हाट्सएप पर साझा करें" : "Share on WhatsApp"}
              title="WhatsApp"
              data-testid="jdl-center-whatsapp-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3" />
              </svg>
            </button>
          </div>
        )}

        {/* Layer 3: Lower-Third Headline Bar (Full available width, fixed label मुख्य खबर / TOP STORY) */}
        <div className="jdl-tv__lower-third" aria-live="polite">
          <div className="jdl-tv__lt-badge">
            <span>
              {language === "hi" ? "मुख्य खबर" : "TOP STORY"}
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
    </div>
  );
}
