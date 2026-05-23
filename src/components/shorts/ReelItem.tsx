"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ShortHighlightStrip } from "@/components/shorts/ShortHighlightStrip";
import { ShortSubtitles } from "@/components/shorts/ShortSubtitles";
import {
  getBookmarkedSlugs,
  toggleShortBookmark,
} from "@/lib/news/shorts/bookmarks";
import { getShortStyle } from "@/lib/news/shorts/styles";
import type { NewsShortCard } from "@/lib/news/shorts/types";

export type ReelItemVariant = "full" | "preview";

type ReelItemProps = {
  short: NewsShortCard;
  active?: boolean;
  variant?: ReelItemVariant;
  onActivate?: () => void;
};

async function shareShort(short: NewsShortCard): Promise<void> {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/shorts/${short.slug}`
      : `/shorts/${short.slug}`;
  const payload = {
    title: short.headline,
    text: short.summary60s.slice(0, 120),
    url,
  };
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }
}

export function ReelItem({
  short,
  active = false,
  variant = "full",
  onActivate,
}: ReelItemProps) {
  const style = getShortStyle(short.section);
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progressMs, setProgressMs] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  const durationMs = short.durationSec * 1000;
  const hasVideo = Boolean(short.videoUrl?.trim());
  const slides =
    short.reelSlides.length > 0
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
    if (hasVideo) return;
    setProgressMs((prev) => {
      const next = prev + 100;
      if (next >= durationMs) return 0;
      const idx = slides.findIndex(
        (s) => next >= s.startMs && next < s.endMs
      );
      if (idx >= 0) setSlideIndex(idx);
      return next;
    });
  }, [durationMs, hasVideo, slides]);

  useEffect(() => {
    setBookmarked(getBookmarkedSlugs().includes(short.slug));
  }, [short.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hasVideo || !video) return;

    if (active) {
      video.muted = muted;
      video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, hasVideo, muted]);

  useEffect(() => {
    if (!active || hasVideo) {
      audioRef.current?.pause();
      if (!active && !hasVideo) return;
      if (hasVideo) return;
    }
    if (!active) return;

    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [active, hasVideo, tick]);

  useEffect(() => {
    if (!active || muted || !short.hasVoice || hasVideo) return;
    const audio = new Audio(short.voiceStreamPath);
    audioRef.current = audio;
    audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [active, muted, short.hasVoice, short.voiceStreamPath, hasVideo]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || variant === "preview") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.55) {
          onActivate?.();
        }
      },
      { threshold: [0.55, 0.75] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onActivate, variant]);

  useEffect(() => {
    if (variant !== "preview" || !active) return;
    onActivate?.();
  }, [active, onActivate, variant]);

  const currentSlide = slides[slideIndex] ?? slides[0];
  const progressPct = hasVideo
    ? videoRef.current
      ? (videoRef.current.currentTime / (short.durationSec || 1)) * 100
      : 0
    : Math.min(100, (progressMs / durationMs) * 100);

  const cssVars = {
    "--short-gradient": style.gradient,
    "--short-accent": style.accent,
    "--short-overlay": style.overlay,
  } as CSSProperties;

  return (
    <article
      ref={rootRef}
      className={`reel-item reel-item--${variant}`}
      style={cssVars}
      data-active={active ? "1" : "0"}
      data-section={short.section}
    >
      <div className="reel-item__media">
        {hasVideo ? (
          <video
            ref={videoRef}
            className="reel-item__video"
            src={short.videoUrl!}
            poster={short.imageUrl || undefined}
            muted={muted}
            playsInline
            loop
            preload={active ? "auto" : "none"}
            aria-label={short.headline}
          />
        ) : short.imageUrl ? (
          <Image
            src={short.imageUrl}
            alt=""
            fill
            sizes={
              variant === "full"
                ? "100vw"
                : "(max-width: 640px) 80vw, 320px"
            }
            className={`reel-item__image${active ? " reel-item__image--playing" : ""}`}
            priority={active && variant === "full"}
            loading={active ? "eager" : "lazy"}
          />
        ) : (
          <div className="reel-item__placeholder" />
        )}
        <div className="reel-item__overlay" aria-hidden />
        <div className="reel-item__progress" aria-hidden>
          <span style={{ width: `${progressPct}%` }} />
        </div>
        {short.isLive ? (
          <span className="reel-item__live">
            <span className="reel-item__live-dot" aria-hidden />
            LIVE
          </span>
        ) : null}
      </div>

      <div
        className="reel-item__side-actions"
        aria-label="Reel actions"
        onClick={(e) => variant === "preview" && e.stopPropagation()}
        onKeyDown={(e) => variant === "preview" && e.stopPropagation()}
      >
        <button
          type="button"
          className="reel-item__action tap-target"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
        </button>
        <button
          type="button"
          className={`reel-item__action tap-target${bookmarked ? " reel-item__action--on" : ""}`}
          onClick={() => setBookmarked(toggleShortBookmark(short.slug))}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          aria-pressed={bookmarked}
        >
          <span aria-hidden>{bookmarked ? "★" : "☆"}</span>
        </button>
        <button
          type="button"
          className={`reel-item__action tap-target${shareDone ? " reel-item__action--on" : ""}`}
          onClick={() => {
            void shareShort(short).then(() => {
              setShareDone(true);
              window.setTimeout(() => setShareDone(false), 2000);
            });
          }}
          aria-label="Share"
        >
          <span aria-hidden>↗</span>
        </button>
        {variant === "full" ? (
          <Link
            href={`/story/${short.slug}`}
            className="reel-item__action reel-item__action--story tap-target"
            aria-label="Read full story"
          >
            <span aria-hidden>📰</span>
          </Link>
        ) : null}
      </div>

      <div className="reel-item__content">
        <span className="reel-item__category">{short.categoryLabel}</span>
        <p className="reel-item__source">
          {short.sourceLabel}
          {short.sourceCount > 1 ? ` · ${short.sourceCount} sources` : ""}
        </p>
        <h2
          className="reel-item__headline"
          lang={short.language === "hi" ? "hi" : undefined}
        >
          {currentSlide.headline}
        </h2>
        {variant === "full" ? (
          <>
            <ShortSubtitles cues={short.subtitles} progressMs={progressMs} />
            <ShortHighlightStrip
              highlights={short.highlights}
              activeIndex={slideIndex}
            />
          </>
        ) : null}
        <p className="reel-item__deck">{short.summary60s}</p>
        {variant === "full" ? (
          <Link
            href={`/story/${short.slug}`}
            className="reel-item__read-cta tap-target"
          >
            पूरी खबर पढ़ें
          </Link>
        ) : null}
      </div>
    </article>
  );
}
