"use client";

import React, { useState } from "react";
import { useBroadcast } from "../BroadcastContext";

/**
 * BroadcastControlBar — Unified Control & Durg Solar Row
 * Layout:
 * [Play/Pause] [Mute/Unmute]  [  DURG SOLAR AD  ]  [Share] [WhatsApp]
 *
 * Rules:
 * - NO location / state desk
 * - NO repeated headline
 * - NO LIVE / time badge
 * - Durg Solar verified info: 3 kW ₹72,000*, 5 kW ₹1,82,000*, durgsolar.com, +91 95847 35857
 * - Share uses Web Share API with clipboard fallback for current story
 * - WhatsApp initiates chat to +91 95847 35857 referencing current story
 */
export function BroadcastControlBar() {
  const { state, togglePlay, toggleMute, setMuted, setPlaying } = useBroadcast();
  const { isPlaying, isMuted, language, currentSegment } = state;
  const [copied, setCopied] = useState(false);

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

  const currentHeadline =
    language === "hi"
      ? (currentSegment?.headlineHi || currentSegment?.headline || "")
      : (currentSegment?.headline || "");

  const getStoryUrl = () => {
    if (typeof window === "undefined") return "https://www.jandarpan.news";
    return currentSegment?.slug
      ? `${window.location.origin}/story/${currentSegment.slug}`
      : window.location.href;
  };

  const handleShare = async () => {
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
      } catch (err) {
        // user cancelled or share failed, fallback to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const handleWhatsApp = () => {
    const url = getStoryUrl();
    const text = encodeURIComponent(
      `नमस्ते Jan Darpan, मैं यह लाइव समाचार साझा कर रहा हूँ:\n\n*${currentHeadline}*\n${url}\n\n(Durg Solar Rooftop Inquiry: 3kW / 5kW)`
    );
    const waUrl = `https://wa.me/919584735857?text=${text}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="jdl-bar" role="region" aria-label="Broadcast controls & Durg Solar">
      {/* LEFT: [Play/Pause] [Mute/Unmute] */}
      <div className="jdl-bar__left">
        <button
          type="button"
          className="jdl-bar__btn"
          onClick={togglePlay}
          aria-label={playLabel}
          title={playLabel}
          data-testid="jdl-play-pause-btn"
        >
          {isPlaying ? (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="5" y="4" width="4" height="16" rx="1" />
              <rect x="15" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              width="11"
              height="11"
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
          data-testid="jdl-mute-btn"
        >
          {isMuted ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
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
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
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

      {/* CENTER: DURG SOLAR ADVERTISEMENT */}
      <a
        href="https://durgsolar.com"
        target="_blank"
        rel="noopener noreferrer"
        className="jdl-bar__ad-slot"
        title="DURG SOLAR — 3 kW ₹72,000* | 5 kW ₹1,82,000*"
        aria-label="Durg Solar advertisement"
      >
        <span className="jdl-bar__ad-sun" aria-hidden="true">☀</span>
        <span className="jdl-bar__ad-brand">DURG SOLAR</span>
        <span className="jdl-bar__ad-divider" aria-hidden="true">|</span>
        <span className="jdl-bar__ad-price">
          <span className="jdl-bar__ad-tier">3 kW <strong>₹72,000*</strong></span>
          <span className="jdl-bar__ad-dot" aria-hidden="true">·</span>
          <span className="jdl-bar__ad-tier">5 kW <strong>₹1,82,000*</strong></span>
        </span>
      </a>

      {/* RIGHT: [Share] [WhatsApp] */}
      <div className="jdl-bar__right">
        <button
          type="button"
          className="jdl-bar__btn jdl-bar__btn--action"
          onClick={handleShare}
          aria-label={copied ? (language === "hi" ? "कॉपी हो गया!" : "Copied!") : (language === "hi" ? "साझा करें" : "Share")}
          title={copied ? "Link Copied!" : "Share Story"}
          data-testid="jdl-share-btn"
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="jdl-bar__btn jdl-bar__btn--whatsapp"
          onClick={handleWhatsApp}
          aria-label="WhatsApp (+91 95847 35857)"
          title="WhatsApp +91 95847 35857"
          data-testid="jdl-whatsapp-btn"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
