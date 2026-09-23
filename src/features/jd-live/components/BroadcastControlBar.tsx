"use client";

import React from "react";
import { useBroadcast } from "../BroadcastContext";
import { BroadcastTicker } from "./BroadcastTicker";

/**
 * Compact broadcast control and ticker bar.
 * Integrates Play/Pause, Mute/Unmute, Live indicator, and Ticker into a professional television graphic bar.
 */
export function BroadcastControlBar() {
  const { state, togglePlay, toggleMute, setMuted, setPlaying } = useBroadcast();
  const { isPlaying, isMuted, audioBlocked, language } = state;

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

  return (
    <div className="jdl-bar" role="region" aria-label="Broadcast controls & news ticker">
      {/* Controls cluster: Play/Pause, Mute, Live Indicator */}
      <div className="jdl-bar__controls">
        <button
          type="button"
          className="jdl-bar__btn"
          onClick={togglePlay}
          aria-label={playLabel}
          title={playLabel}
        >
          <span className="jdl-bar__icon" aria-hidden>
            {isPlaying ? "⏸" : "▶"}
          </span>
          <span className="jdl-bar__btn-text">{playLabel}</span>
        </button>

        <button
          type="button"
          className={`jdl-bar__btn ${isMuted ? "jdl-bar__btn--muted" : ""}`}
          onClick={toggleMute}
          aria-label={soundLabel}
          title={soundLabel}
        >
          <span className="jdl-bar__icon" aria-hidden>
            {isMuted ? "🔇" : "🔊"}
          </span>
          <span className="jdl-bar__btn-text">
            {isMuted
              ? language === "hi"
                ? "आवाज़"
                : "Sound"
              : language === "hi"
              ? "चालू"
              : "On"}
          </span>
        </button>

        {/* Small live badge */}
        <div className="jdl-bar__live">
          <span className="jdl-bar__live-dot" aria-hidden />
          <span className="jdl-bar__live-text">
            {language === "hi" ? "लाइव" : "LIVE"}
          </span>
        </div>
      </div>

      {/* Prominent one-tap sound prompt if muted/blocked */}
      {isMuted && isPlaying && (
        <button
          type="button"
          className="jdl-bar__sound-prompt"
          onClick={handleStartWithSound}
          aria-label={language === "hi" ? "आवाज़ चालू करें" : "Turn on sound"}
        >
          🔊 {language === "hi" ? "आवाज़ चालू करें" : "Turn on sound"}
        </button>
      )}

      {/* Continuous scrolling ticker */}
      <div className="jdl-bar__ticker-wrap">
        <BroadcastTicker />
      </div>
    </div>
  );
}
