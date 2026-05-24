"use client";

import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Pause,
  Share2,
  Volume2,
} from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { getShortStyle } from "@/lib/news/shorts/styles";
import {
  isShortBookmarked,
  toggleShortBookmark,
} from "@/lib/news/shorts/bookmarks";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { useLanguage } from "@/providers/LanguageProvider";

type ShortsReelCardProps = {
  short: NewsShortCard;
  active?: boolean;
  index?: number;
  onActivate?: () => void;
};

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function shareShort(short: NewsShortCard): Promise<void> {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/shorts?start=${encodeURIComponent(short.slug)}`
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
      /* cancelled */
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }
}

export const ShortsReelCard = memo(function ShortsReelCard({
  short,
  active = false,
  index = 0,
  onActivate,
}: ShortsReelCardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const style = getShortStyle(short.section);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [liked, setLiked] = useState(false);
  const [listening, setListening] = useState(false);

  const hasVideo = Boolean(short.videoUrl?.trim());
  const durationLabel = formatDuration(short.durationSec);

  const openReel = useCallback(() => {
    router.push(`/shorts?start=${encodeURIComponent(short.slug)}`);
  }, [router, short.slug]);

  useEffect(() => {
    setLiked(isShortBookmarked(short.slug));
  }, [short.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hasVideo || !video) return;
    if (active) {
      video.muted = true;
      video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, hasVideo]);

  useEffect(() => {
    if (!listening || !short.hasVoice || !active) {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }
    const audio = new Audio(short.voiceStreamPath);
    audioRef.current = audio;
    audio.play().catch(() => setListening(false));
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [listening, short.hasVoice, short.voiceStreamPath, active]);

  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        transition: {
          duration: 0.4,
          delay: Math.min(index * 0.05, 0.25),
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };

  return (
    <motion.article
      className={`shorts-reel-card${active ? " shorts-reel-card--active" : ""}`}
      style={
        {
          "--sr-accent": style.accent,
          "--sr-gradient": style.gradient,
        } as CSSProperties
      }
      onMouseEnter={onActivate}
      onFocus={onActivate}
      {...motionProps}
    >
      <div
        role="link"
        tabIndex={0}
        className="shorts-reel-card__hit tap-target"
        onClick={openReel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openReel();
          }
        }}
        aria-label={`${short.headline}. ${durationLabel}`}
      >
        <div className="shorts-reel-card__media">
          {hasVideo ? (
            <video
              ref={videoRef}
              className="shorts-reel-card__video"
              src={short.videoUrl!}
              poster={short.imageUrl || undefined}
              muted
              playsInline
              loop
              preload={active ? "auto" : "none"}
              aria-hidden
            />
          ) : short.imageUrl ? (
            <Image
              src={short.imageUrl}
              alt=""
              fill
              sizes="(max-width: 480px) 42vw, 200px"
              className={`shorts-reel-card__image${active ? " shorts-reel-card__image--active" : ""}`}
              priority={active && index < 2}
              loading={active ? "eager" : "lazy"}
            />
          ) : (
            <div className="shorts-reel-card__placeholder" aria-hidden />
          )}

          <div className="shorts-reel-card__overlay" aria-hidden />

          <div className="shorts-reel-card__top">
            <span className="shorts-reel-card__category">{short.categoryLabel}</span>
            {short.isLive ? (
              <span className="shorts-reel-card__live" role="status">
                <span className="shorts-reel-card__live-dot" aria-hidden />
                {t.common.live}
              </span>
            ) : null}
            <span className="shorts-reel-card__duration">{durationLabel}</span>
          </div>

          <h3
            className="shorts-reel-card__title"
            lang={short.language === "hi" ? "hi" : undefined}
          >
            {short.headline}
          </h3>
        </div>

        <div
          className="shorts-reel-card__actions"
          role="group"
          aria-label={t.shorts.actionsAria}
          onClick={stop}
          onPointerDown={stop}
        >
          <motion.button
            type="button"
            className={`shorts-reel-card__action tap-target${liked ? " is-on" : ""}`}
            aria-label={liked ? t.shorts.bookmarked : t.shorts.bookmark}
            aria-pressed={liked}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            onClick={(e) => {
              stop(e);
              const on = toggleShortBookmark(short.slug);
              setLiked(on);
              triggerHaptic(on ? "success" : "light");
            }}
          >
            <Heart
              strokeWidth={2}
              fill={liked ? "currentColor" : "none"}
              aria-hidden
            />
          </motion.button>

          <motion.button
            type="button"
            className="shorts-reel-card__action tap-target"
            aria-label={t.shorts.share}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            onClick={(e) => {
              stop(e);
              triggerHaptic("light");
              void shareShort(short);
            }}
          >
            <Share2 strokeWidth={2} aria-hidden />
          </motion.button>

          {short.hasVoice ? (
            <motion.button
              type="button"
              className={`shorts-reel-card__action tap-target${listening ? " is-on" : ""}`}
              aria-label={
                listening ? t.shorts.pause : t.cardActions.listen
              }
              aria-pressed={listening}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              onClick={(e) => {
                stop(e);
                if (!active) onActivate?.();
                setListening((v) => !v);
                triggerHaptic("medium");
              }}
            >
              {listening ? (
                <Pause strokeWidth={2} aria-hidden />
              ) : (
                <Volume2 strokeWidth={2} aria-hidden />
              )}
            </motion.button>
          ) : null}

          <motion.a
            href={`/story/${short.slug}`}
            className="shorts-reel-card__action tap-target"
            aria-label={t.cardActions.comment}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            onClick={(e) => {
              stop(e);
              triggerHaptic("light");
            }}
          >
            <MessageCircle strokeWidth={2} aria-hidden />
          </motion.a>
        </div>
      </div>
    </motion.article>
  );
});
