"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { ShortHighlightStrip } from "@/components/shorts/ShortHighlightStrip";
import { ShortSubtitles } from "@/components/shorts/ShortSubtitles";
import { useMotionConfig } from "@/design-system/motion";
import { focusRingClass } from "@/design-system/utils/aria";
import { formatRelativeTime } from "@/lib/i18n/format";
import { getShortStyle } from "@/lib/news/shorts/styles";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReelPlayback } from "../hooks/useReelPlayback";
import { ReelLike } from "./ReelLike";
import { ReelProgress } from "./ReelProgress";
import { ReelReadFullStory } from "./ReelReadFullStory";
import { ReelSave } from "./ReelSave";
import { ReelShare } from "./ReelShare";

type ReelCardProps = {
  short: NewsShortCard;
  active?: boolean;
  prewarm?: boolean;
  onActivate?: () => void;
};

/**
 * JDP-017 — Single premium reel card (media + actions + story chrome)
 */
export function ReelCard({
  short,
  active = false,
  prewarm = false,
  onActivate,
}: ReelCardProps) {
  const { t, language } = useLanguage();
  const { reduced, transition } = useMotionConfig();
  const rootRef = useRef<HTMLElement>(null);
  const style = getShortStyle(short.section);

  const {
    videoRef,
    hasVideo,
    slides,
    slideIndex,
    currentSlide,
    progressMs,
    slideProgressInSegment,
    muted,
    setMuted,
    paused,
    togglePlay,
  } = useReelPlayback({ short, active });

  const timeLabel = formatRelativeTime(short.publishedAt, language);
  const preloadVideo = active || prewarm ? "auto" : "none";

  const cssVars = {
    "--reels-v3-gradient": style.gradient,
    "--reels-v3-accent": style.accent,
    "--reels-v3-overlay": style.overlay,
  } as CSSProperties;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

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
  }, [onActivate]);

  return (
    <article
      ref={rootRef}
      className={`reels-v3-card${active ? " reels-v3-card--active" : ""}${paused ? " reels-v3-card--paused" : ""}`}
      style={cssVars}
      data-active={active ? "1" : "0"}
      data-section={short.section}
      aria-current={active ? "true" : undefined}
    >
      <div className="reels-v3-card__media">
        {hasVideo ? (
          <video
            ref={videoRef}
            className="reels-v3-card__video"
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
            sizes="100vw"
            className={`reels-v3-card__image${active && !paused ? " reels-v3-card__image--playing" : ""}`}
            priority={active}
            loading={active || prewarm ? "eager" : "lazy"}
          />
        ) : (
          <div className="reels-v3-card__placeholder" aria-hidden />
        )}

        <button
          type="button"
          className="reels-v3-card__tap-zone tap-target"
          onClick={togglePlay}
          aria-label={paused ? t.shorts.play : t.shorts.pause}
        />

        <div className="reels-v3-card__scrim" aria-hidden />

        <div className="reels-v3-card__progress-top">
          <ReelProgress
            total={slides.length}
            activeIndex={slideIndex}
            progressPct={slideProgressInSegment}
          />
        </div>

        {short.isLive ? (
          <span className="reels-v3-card__live">
            <span className="reels-v3-card__live-dot" aria-hidden />
            {t.common.live}
          </span>
        ) : null}

        {paused && active ? (
          <span className="reels-v3-card__paused-badge" aria-hidden>
            ❚❚
          </span>
        ) : null}
      </div>

      <motion.aside
        className="reels-v3-card__actions"
        aria-label={t.shorts.actionsAria}
        initial={false}
        animate={
          reduced
            ? undefined
            : active
              ? { opacity: 1, x: 0 }
              : { opacity: 0.72, x: 4 }
        }
        transition={transition("fast")}
      >
        <button
          type="button"
          className={`reels-v3-action tap-target ${focusRingClass}`}
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t.shorts.unmute : t.shorts.mute}
        >
          <span className="reels-v3-action__icon" aria-hidden>
            {muted ? (
              <VolumeX size={22} strokeWidth={2} />
            ) : (
              <Volume2 size={22} strokeWidth={2} />
            )}
          </span>
        </button>

        {short.hasVoice ? (
          <span className="reels-v3-card__narration" title={t.shorts.narration}>
            {t.shorts.narrationShort}
          </span>
        ) : null}

        <ReelLike slug={short.slug} />
        <ReelSave slug={short.slug} />
        <ReelShare short={short} />
        <ReelReadFullStory slug={short.slug} />
      </motion.aside>

      <div className="reels-v3-card__content">
        <div className="reels-v3-card__meta">
          <span className="reels-v3-card__category">{short.categoryLabel}</span>
          <time className="reels-v3-card__time" dateTime={short.publishedAt}>
            {timeLabel}
          </time>
        </div>

        <p className="reels-v3-card__source">
          {short.sourceLabel}
          {short.sourceCount > 1
            ? ` · ${short.sourceCount} ${language === "en" ? "sources" : "स्रोत"}`
            : ""}
        </p>

        <h2
          className="reels-v3-card__headline"
          lang={short.language === "hi" ? "hi" : undefined}
        >
          {currentSlide.headline}
        </h2>

        <ShortSubtitles
          cues={short.subtitles}
          progressMs={progressMs}
          cinematic
        />

        <ShortHighlightStrip
          highlights={short.highlights}
          activeIndex={slideIndex}
        />

        <p className="reels-v3-card__deck">{short.summary60s}</p>

        <ReelReadFullStory slug={short.slug} variant="cta" />
      </div>
    </article>
  );
}
