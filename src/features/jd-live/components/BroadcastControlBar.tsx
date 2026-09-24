"use client";

import React from "react";
import { useBroadcast } from "../BroadcastContext";

/**
 * Primary bottom broadcast bar.
 * Contains:
 *   [small Play/Pause] [small Mute/Unmute] मुख्य खबर | IMPORTANT CHHATTISGARH HEADLINE
 */
export function BroadcastControlBar() {
  const { state, togglePlay, toggleMute, setMuted, setPlaying } = useBroadcast();
  const { isPlaying, isMuted, language, mode, currentSegment } = state;

  const playLabel = isPlaying
    ? language === "hi"
      ? "रोकें"
      : "Pause"
    : language === "hi"
    ? "चलाएं"
    : "Play";

  const soundLabel = isMuted
    ? language === "hi"
      ? "आवाज़ चालू करें"
      : "Turn on sound"
    : language === "hi"
    ? "म्यूट करें"
    : "Mute";

  const handleStartWithSound = () => {
    setPlaying(true);
    setMuted(false);
  };

  const isBreaking = mode === "breaking" || !!currentSegment?.isBreaking;

  const primaryTag = isBreaking
    ? language === "hi"
      ? "ब्रेकिंग न्यूज़"
      : "BREAKING NEWS"
    : language === "hi"
    ? "मुख्य खबर"
    : "MAIN STORY";

  const currentHeadline =
    language === "hi"
      ? (currentSegment?.headlineHi || currentSegment?.headline || "")
      : (currentSegment?.headline || "");

  return (
    <div className="jdl-bar" role="region" aria-label="Broadcast controls & headline">
      {/* Clean premium SVG player controls: [▶] [🔊] */}
      <div className="jdl-bar__controls">
        <button
          type="button"
          className="jdl-bar__btn"
          onClick={togglePlay}
          aria-label={playLabel}
          title={playLabel}
        >
          {isPlaying ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="5" y="4" width="4" height="16" rx="1" />
              <rect x="15" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 4.5l14 7.5-14 7.5v-15z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`jdl-bar__btn ${isMuted ? "jdl-bar__btn--muted" : ""}`}
          onClick={isMuted ? handleStartWithSound : toggleMute}
          aria-label={soundLabel}
          title={soundLabel}
        >
          {isMuted ? (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>

      {/* Small primary editorial label: मुख्य खबर */}
      <div className={`jdl-bar__label ${isBreaking ? "jdl-bar__label--breaking" : ""}`}>
        <span className="jdl-bar__label-text">{primaryTag}</span>
      </div>

      {/* Dominant Headline Area: Headline gets majority of the bar */}
      <div className="jdl-bar__headline-area" aria-live="polite">
        <span className="jdl-bar__headline-sep">|</span>
        <span className="jdl-bar__headline-text">{currentHeadline}</span>
      </div>
    </div>
  );
}
