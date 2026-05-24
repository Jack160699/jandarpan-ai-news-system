"use client";

import type { MouseEvent } from "react";
import { Pause, Volume2 } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import {
  buildArticleShareUrl,
  buildWhatsAppShareUrl,
} from "@/lib/speech/whatsapp";
import type { SpeechLangHint } from "@/lib/speech/voice-utils";
import { useArticleSpeechOptional } from "@/providers/ArticleSpeechProvider";
import { useLanguage } from "@/providers/LanguageProvider";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

export type ArticleCardActionsProps = {
  articleId: string;
  headline: string;
  summary?: string;
  /** Story slug or absolute path e.g. /story/foo */
  slugOrPath: string;
  langHint?: SpeechLangHint;
  className?: string;
  /** Long-press listen button cycles playback speed */
  enableSpeedCycle?: boolean;
};

function stopBubble(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function ArticleCardActions({
  articleId,
  headline,
  summary,
  slugOrPath,
  langHint = "auto",
  className = "",
  enableSpeedCycle = false,
}: ArticleCardActionsProps) {
  const { t } = useLanguage();
  const speech = useArticleSpeechOptional();
  const shareUrl = buildArticleShareUrl(slugOrPath);
  const waHref = buildWhatsAppShareUrl(headline, shareUrl);

  const speaking = speech?.isSpeaking(articleId) ?? false;
  const paused = speech?.isPaused(articleId) ?? false;
  const active = speech?.isActive(articleId) ?? false;

  const actions = t.cardActions ?? {
    groupLabel: "Share and listen",
    whatsapp: "WhatsApp",
    listen: "Listen",
    pause: "Pause",
    resume: "Resume",
  };

  const listenLabel = paused
    ? actions.resume
    : speaking
      ? actions.pause
      : actions.listen;

  const onWhatsApp = (e: MouseEvent) => {
    stopBubble(e);
    triggerHaptic("light");
    window.open(waHref, "_blank", "noopener,noreferrer");
  };

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

  return (
    <div
      className={`article-card-actions${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={actions.groupLabel}
      onClick={stopBubble}
      onPointerDown={stopBubble}
    >
      <a
        href={waHref}
        className="article-card-actions__btn article-card-actions__btn--wa tap-target"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={actions.whatsapp}
        onClick={onWhatsApp}
      >
        <WhatsAppIcon className="article-card-actions__icon" />
        <span className="article-card-actions__label">{actions.whatsapp}</span>
      </a>

      <button
        type="button"
        className={`article-card-actions__btn article-card-actions__btn--listen tap-target${active ? " is-active" : ""}${speaking ? " is-speaking" : ""}`}
        aria-label={listenLabel}
        aria-pressed={active}
        onClick={onListen}
        onDoubleClick={
          enableSpeedCycle && speech
            ? (e) => {
                stopBubble(e);
                speech.cycleRate();
                triggerHaptic("light");
              }
            : undefined
        }
      >
        <span className="article-card-actions__listen-ring" aria-hidden />
        {paused ? (
          <Pause className="article-card-actions__icon" strokeWidth={2} aria-hidden />
        ) : (
          <Volume2
            className={`article-card-actions__icon${speaking ? " article-card-actions__icon--pulse" : ""}`}
            strokeWidth={2}
            aria-hidden
          />
        )}
        <span className="article-card-actions__label">{listenLabel}</span>
      </button>
    </div>
  );
}
