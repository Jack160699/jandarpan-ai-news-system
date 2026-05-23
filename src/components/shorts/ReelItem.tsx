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
import { ReelSegmentProgress } from "@/components/shorts/ReelSegmentProgress";
import { ShortHighlightStrip } from "@/components/shorts/ShortHighlightStrip";
import { ShortSubtitles } from "@/components/shorts/ShortSubtitles";
import { formatRelativeTime } from "@/lib/i18n/format";
import {
  getBookmarkedSlugs,
  toggleShortBookmark,
} from "@/lib/news/shorts/bookmarks";
import { getShortStyle } from "@/lib/news/shorts/styles";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { useLanguage } from "@/providers/LanguageProvider";

export type ReelItemVariant = "full" | "preview";

type ReelItemProps = {
  short: NewsShortCard;
  active?: boolean;
  prewarm?: boolean;
  variant?: ReelItemVariant;
  onActivate?: () => void;
};

async function shareShort(short: NewsShortCard): Promise<void> {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/shorts?start=${short.slug}`
      : `/shorts?start=${short.slug}`;
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
  prewarm = false,
  variant = "full",
  onActivate,
}: ReelItemProps) {
  const { t, language } = useLanguage();
  const style = getShortStyle(short.section);
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progressMs, setProgressMs] = useState(0);
  const [videoProgressPct, setVideoProgressPct] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
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
    if (hasVideo || paused) return;
    setProgressMs((prev) => {
      const next = prev + 100;
      if (next >= durationMs) return 0;
      const idx = slides.findIndex(
        (s) => next >= s.startMs && next < s.endMs
      );
      if (idx >= 0) setSlideIndex(idx);
      return next;
    });
  }, [durationMs, hasVideo, paused, slides]);

  useEffect(() => {
    setBookmarked(getBookmarkedSlugs().includes(short.slug));
  }, [short.slug]);

  useEffect(() => {
    if (!active) {
      setProgressMs(0);
      setSlideIndex(0);
      setPaused(false);
      setVideoProgressPct(0);
    }
  }, [active, short.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hasVideo || !video) return;

    if (active && !paused) {
      video.muted = muted;
      video.play().catch(() => undefined);
    } else {
      video.pause();
      if (!active) video.currentTime = 0;
    }
  }, [active, hasVideo, muted, paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hasVideo || !video || !active) return;

    const onTime = () => {
      const dur = video.duration || short.durationSec || 1;
      setVideoProgressPct((video.currentTime / dur) * 100);
      const ms = video.currentTime * 1000;
      setProgressMs(ms);
      const idx = slides.findIndex((s) => ms >= s.startMs && ms < s.endMs);
      if (idx >= 0) setSlideIndex(idx);
    };

    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [active, hasVideo, short.durationSec, slides]);

  useEffect(() => {
    if (!active || hasVideo || paused) return;
    const id = window.setInterval(tick, 100);
    return () => clearInterval(id);
  }, [active, hasVideo, paused, tick]);

  useEffect(() => {
    if (!active || muted || !short.hasVoice || hasVideo) {
      audioRef.current?.pause();
      return;
    }
    const audio = new Audio(short.voiceStreamPath);
    audioRef.current = audio;
    if (!paused) audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [active, muted, short.hasVoice, short.voiceStreamPath, hasVideo, paused]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || variant === "preview") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.6) {
          onActivate?.();
        }
      },
      { threshold: [0.6, 0.85] }
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
    ? videoProgressPct
    : Math.min(100, (progressMs / durationMs) * 100);

  const slideProgressInSegment = (() => {
    const slide = slides[slideIndex];
    if (!slide) return progressPct;
    const span = slide.endMs - slide.startMs || 1;
    const local = progressMs - slide.startMs;
    return Math.min(100, Math.max(0, (local / span) * 100));
  })();

  const timeLabel = formatRelativeTime(short.publishedAt, language);
  const preloadVideo = active || prewarm ? "auto" : "none";

  const cssVars = {
    "--short-gradient": style.gradient,
    "--short-accent": style.accent,
    "--short-overlay": style.overlay,
  } as CSSProperties;

  const togglePlay = () => {
    if (hasVideo) {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => undefined);
        setPaused(false);
      } else {
        v.pause();
        setPaused(true);
      }
    } else {
      setPaused((p) => !p);
    }
  };

  return (
    <article
      ref={rootRef}
      className={`reel-item reel-item--${variant}${active ? " reel-item--active" : ""}${paused ? " reel-item--paused" : ""}`}
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
            preload={preloadVideo}
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
            className={`reel-item__image${active && !paused ? " reel-item__image--playing" : ""}`}
            priority={active && variant === "full"}
            loading={active || prewarm ? "eager" : "lazy"}
          />
        ) : (
          <div className="reel-item__placeholder" />
        )}

        <button
          type="button"
          className="reel-item__tap-zone tap-target"
          onClick={togglePlay}
          aria-label={paused ? t.shorts.play : t.shorts.pause}
        />

        <div className="reel-item__overlay reel-item__overlay--cinematic" aria-hidden />

        <div className="reel-item__progress-top">
          <ReelSegmentProgress
            total={slides.length}
            activeIndex={slideIndex}
            progressPct={slideProgressInSegment}
          />
        </div>

        {short.isLive ? (
          <span className="reel-item__live">
            <span className="reel-item__live-dot" aria-hidden />
            {t.common.live}
          </span>
        ) : null}

        {paused && active ? (
          <span className="reel-item__paused-badge" aria-hidden>
            ❚❚
          </span>
        ) : null}
      </div>

      <div className="reel-item__side-actions" aria-label={t.shorts.actionsAria}>
        <button
          type="button"
          className="reel-item__action tap-target"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t.shorts.unmute : t.shorts.mute}
        >
          <span className="reel-item__action-icon" aria-hidden>
            {muted ? "🔇" : "🔊"}
          </span>
        </button>
        {short.hasVoice ? (
          <span className="reel-item__narration-pill" title={t.shorts.narration}>
            {t.shorts.narrationShort}
          </span>
        ) : null}
        <button
          type="button"
          className={`reel-item__action tap-target${bookmarked ? " reel-item__action--on" : ""}`}
          onClick={() => setBookmarked(toggleShortBookmark(short.slug))}
          aria-label={bookmarked ? t.shorts.bookmarked : t.shorts.bookmark}
          aria-pressed={bookmarked}
        >
          <span className="reel-item__action-icon" aria-hidden>
            {bookmarked ? "★" : "☆"}
          </span>
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
          aria-label={t.shorts.share}
        >
          <span className="reel-item__action-icon" aria-hidden>
            ↗
          </span>
        </button>
        {variant === "full" ? (
          <Link
            href={`/story/${short.slug}`}
            className="reel-item__action reel-item__action--story tap-target"
            aria-label={t.shorts.readFull}
          >
            <span className="reel-item__action-icon" aria-hidden>
              📰
            </span>
          </Link>
        ) : null}
      </div>

      <div className="reel-item__content reel-item__content--premium">
        <div className="reel-item__meta-row">
          <span className="reel-item__category">{short.categoryLabel}</span>
          <time className="reel-item__time" dateTime={short.publishedAt}>
            {timeLabel}
          </time>
        </div>
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
          <ShortSubtitles
            cues={short.subtitles}
            progressMs={progressMs}
            cinematic
          />
        ) : null}

        {variant === "full" ? (
          <ShortHighlightStrip
            highlights={short.highlights}
            activeIndex={slideIndex}
          />
        ) : null}

        <p className="reel-item__deck">{short.summary60s}</p>

        {variant === "full" ? (
          <Link
            href={`/story/${short.slug}`}
            className="reel-item__read-cta tap-target"
          >
            {t.shorts.readFull}
            <span className="reel-item__read-cta-arrow" aria-hidden>
              →
            </span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
