"use client";

import type { MouseEvent } from "react";
import { Pause, Volume2 } from "lucide-react";
import { Button } from "@/design-system";
import { triggerHaptic } from "@/lib/mobile/haptics";
import type { SpeechLangHint } from "@/lib/speech/voice-utils";
import { useArticleSpeechOptional } from "@/providers/ArticleSpeechProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type ListenButtonProps = {
  articleId: string;
  headline: string;
  summary?: string;
  langHint?: SpeechLangHint;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function ListenButton({
  articleId,
  headline,
  summary,
  langHint = "auto",
  size = "sm",
  className,
}: ListenButtonProps) {
  const { t } = useLanguage();
  const speech = useArticleSpeechOptional();

  const speaking = speech?.isSpeaking(articleId) ?? false;
  const paused = speech?.isPaused(articleId) ?? false;

  const actions = t.cardActions ?? {
    listen: "Listen",
    pause: "Pause",
    resume: "Resume",
  };

  const label = paused ? actions.resume : speaking ? actions.pause : actions.listen;

  const onListen = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!speech) return;
    triggerHaptic(speaking || paused ? "selection" : "medium");
    void speech.toggle({
      articleId,
      headline,
      body: summary,
      langHint,
    });
  };

  if (!speech) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      onClick={onListen}
      aria-label={label}
      aria-pressed={speaking || paused}
    >
      {speaking && !paused ? (
        <Pause size={16} aria-hidden />
      ) : (
        <Volume2 size={16} aria-hidden />
      )}
      <span>{label}</span>
    </Button>
  );
}
