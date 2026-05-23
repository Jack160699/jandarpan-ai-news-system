"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShortHighlightStrip } from "@/components/shorts/ShortHighlightStrip";
import { ShortSubtitles } from "@/components/shorts/ShortSubtitles";
import { getShortStyle } from "@/lib/news/shorts/styles";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type NewsShortCardProps = {
  short: NewsShortCard;
  autoplay?: boolean;
  active?: boolean;
  onActivate?: () => void;
};

export function NewsShortCard({
  short,
  autoplay = true,
  active = false,
  onActivate,
}: NewsShortCardProps) {
  const style = getShortStyle(short.section);
  const rootRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progressMs, setProgressMs] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  const durationMs = short.durationSec * 1000;
  const slides = short.reelSlides.length
    ? short.reelSlides
    : [
        {
          id: "0",
          startMs: 0,
          endMs: durationMs,
          headline: short.headline,
          caption: short.summary60s,
          imageUrl: short.imageUrl,
        },
      ];

  const tick = useCallback(() => {
    setProgressMs((prev) => {
      const next = prev + 100;
      if (next >= durationMs) return 0;
      const idx = slides.findIndex(
        (s) => next >= s.startMs && next < s.endMs
      );
      if (idx >= 0) setSlideIndex(idx);
      return next;
    });
  }, [durationMs, slides]);

  useEffect(() => {
    if (!autoplay || !active) {
      setPlaying(false);
      audioRef.current?.pause();
      return;
    }
    setPlaying(true);
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [autoplay, active, tick]);

  useEffect(() => {
    if (!active || muted || !short.hasVoice) return;
    const audio = new Audio(short.voiceStreamPath);
    audioRef.current = audio;
    audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [active, muted, short.hasVoice, short.voiceStreamPath]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !autoplay) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting && entries[0].intersectionRatio > 0.6;
        if (visible) onActivate?.();
      },
      { threshold: [0.6, 0.85] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay, onActivate]);

  const currentSlide = slides[slideIndex] ?? slides[0];
  const progressPct = Math.min(100, (progressMs / durationMs) * 100);

  return (
    <article
      ref={rootRef}
      className="short-card"
      style={
        {
          "--short-gradient": style.gradient,
          "--short-accent": style.accent,
          "--short-overlay": style.overlay,
        } as React.CSSProperties
      }
      data-playing={playing ? "1" : "0"}
      data-section={short.section}
    >
      <div className="short-card__media">
        {short.imageUrl ? (
          <Image
            src={short.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="short-card__image"
            priority={active}
          />
        ) : (
          <div className="short-card__placeholder" />
        )}
        <div className="short-card__overlay" />
        <div className="short-card__progress">
          <span style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="short-card__content">
        <span className="short-card__badge">{style.badgeHi}</span>
        <p className="short-card__anchor">{short.anchorLine}</p>
        <h2 className="short-card__headline">{currentSlide.headline}</h2>
        <ShortSubtitles cues={short.subtitles} progressMs={progressMs} />
        <ShortHighlightStrip
          highlights={short.highlights}
          activeIndex={slideIndex}
        />
        <p className="short-card__deck">{short.summary60s}</p>
      </div>

      <div className="short-card__actions">
        <button
          type="button"
          className="short-card__btn tap-target"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute narration" : "Mute narration"}
        >
          {muted ? "Sound" : "Mute"}
        </button>
        <Link
          href={`/story/${short.slug}`}
          className="short-card__btn short-card__btn--read tap-target"
        >
          Full story
        </Link>
      </div>
    </article>
  );
}
