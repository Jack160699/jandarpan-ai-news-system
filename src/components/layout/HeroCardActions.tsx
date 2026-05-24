"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Pause,
  Share2,
  Volume2,
} from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { buildArticleShareUrl } from "@/lib/speech/whatsapp";
import type { SpeechLangHint } from "@/lib/speech/voice-utils";
import { useArticleSpeechOptional } from "@/providers/ArticleSpeechProvider";
import { useLanguage } from "@/providers/LanguageProvider";

const LIKES_KEY = "chronicle-hero-likes";

function loadLikedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistLikedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify([...ids]));
  } catch {
    /* private mode */
  }
}

function stopBubble(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

const glassBtn = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
  tap: { scale: 0.92 },
};

export type HeroCardActionsProps = {
  articleId: string;
  headline: string;
  summary?: string;
  slugOrPath: string;
  commentHref: string;
  langHint?: SpeechLangHint;
  className?: string;
};

export function HeroCardActions({
  articleId,
  headline,
  summary,
  slugOrPath,
  commentHref,
  langHint = "auto",
  className = "",
}: HeroCardActionsProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const speech = useArticleSpeechOptional();
  const [liked, setLiked] = useState(false);

  const actions = t.cardActions;
  const shareUrl = buildArticleShareUrl(slugOrPath);

  const speaking = speech?.isSpeaking(articleId) ?? false;
  const paused = speech?.isPaused(articleId) ?? false;
  const active = speech?.isActive(articleId) ?? false;

  const listenLabel = paused
    ? actions.resume
    : speaking
      ? actions.pause
      : actions.listen;

  useEffect(() => {
    setLiked(loadLikedIds().has(articleId));
  }, [articleId]);

  const onShare = useCallback(
    async (e: MouseEvent) => {
      stopBubble(e);
      triggerHaptic("light");
      if (navigator.share) {
        try {
          await navigator.share({ title: headline, url: shareUrl, text: headline });
          return;
        } catch {
          /* cancelled */
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
    },
    [headline, shareUrl]
  );

  const onListen = (e: MouseEvent) => {
    stopBubble(e);
    if (!speech) return;
    triggerHaptic(active ? "selection" : "medium");
    void speech.toggle({
      articleId,
      headline,
      body: summary,
      langHint,
    });
  };

  const onLike = (e: MouseEvent) => {
    stopBubble(e);
    const next = !liked;
    setLiked(next);
    const ids = loadLikedIds();
    if (next) ids.add(articleId);
    else ids.delete(articleId);
    persistLikedIds(ids);
    triggerHaptic(next ? "success" : "light");
  };

  const onComment = (e: MouseEvent) => {
    stopBubble(e);
    triggerHaptic("light");
  };

  const motionProps = reduceMotion
    ? {}
    : { whileHover: "hover" as const, whileTap: "tap" as const };

  return (
    <div
      className={`hero-card-actions${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={actions.groupLabel}
      onClick={stopBubble}
      onPointerDown={stopBubble}
    >
      <motion.button
        type="button"
        className="hero-card-actions__btn tap-target"
        aria-label={actions.share}
        variants={glassBtn}
        initial="rest"
        {...motionProps}
        onClick={onShare}
      >
        <Share2 className="hero-card-actions__icon" strokeWidth={2} aria-hidden />
      </motion.button>

      <motion.button
        type="button"
        className={`hero-card-actions__btn tap-target${active ? " is-active" : ""}${speaking ? " is-speaking" : ""}`}
        aria-label={listenLabel}
        aria-pressed={active}
        variants={glassBtn}
        initial="rest"
        {...motionProps}
        onClick={onListen}
      >
        {paused ? (
          <Pause className="hero-card-actions__icon" strokeWidth={2} aria-hidden />
        ) : (
          <Volume2
            className={`hero-card-actions__icon${speaking ? " hero-card-actions__icon--pulse" : ""}`}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </motion.button>

      <motion.button
        type="button"
        className={`hero-card-actions__btn tap-target${liked ? " is-liked" : ""}`}
        aria-label={liked ? actions.liked : actions.like}
        aria-pressed={liked}
        variants={glassBtn}
        initial="rest"
        {...motionProps}
        onClick={onLike}
      >
        <Heart
          className="hero-card-actions__icon"
          strokeWidth={2}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
      </motion.button>

      <motion.a
        href={commentHref}
        className="hero-card-actions__btn tap-target"
        aria-label={actions.comment}
        variants={glassBtn}
        initial="rest"
        {...motionProps}
        onClick={onComment}
      >
        <MessageCircle className="hero-card-actions__icon" strokeWidth={2} aria-hidden />
      </motion.a>
    </div>
  );
}
