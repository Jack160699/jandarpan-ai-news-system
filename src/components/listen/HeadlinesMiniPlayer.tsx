"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/listen/narrator";
import { useHeadlinesListenOptional } from "@/providers/HeadlinesListenProvider";
import { useLanguage } from "@/providers/LanguageProvider";

export function HeadlinesMiniPlayer() {
  const ctx = useHeadlinesListenOptional();
  const { language } = useLanguage();
  const pathname = usePathname() ?? "/";

  if (!ctx?.hasPlaylist || !ctx.track) return null;

  const {
    track,
    playing,
    loading,
    togglePlay,
    next,
    clearPlaylist,
    currentTime,
    duration,
    index,
    tracks,
  } = ctx;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hi = language !== "en";
  // Story pages hide the bottom nav — dock the player flush to the bottom
  const flush = pathname.startsWith("/story/");

  return (
    <div
      className={cn("hl-mini", flush && "hl-mini--flush")}
      role="region"
      aria-label={hi ? "अभी चल रहा है" : "Now playing"}
    >
      <div className="hl-mini__progress" aria-hidden>
        <span style={{ width: `${progressPct}%` }} />
      </div>
      <div className="hl-mini__inner">
        <button
          type="button"
          className="hl-mini__play tap-target"
          onClick={togglePlay}
          aria-label={
            playing ? (hi ? "रोकें" : "Pause") : (hi ? "चलाएँ" : "Play")
          }
        >
          {loading ? "…" : playing ? "❚❚" : "▶"}
        </button>
        <Link href="/listen" className="hl-mini__info tap-target">
          <p className="hl-mini__label">{hi ? "अभी सुन रहे हैं" : "Now playing"}</p>
          <p
            className="hl-mini__title"
            lang={track.language === "hi" ? "hi" : undefined}
          >
            {track.headline}
          </p>
          <p className="hl-mini__time">
            {formatDuration(currentTime)} / {formatDuration(duration)} · {index + 1}/
            {tracks.length}
          </p>
        </Link>
        <button
          type="button"
          className="hl-mini__next tap-target"
          onClick={next}
          disabled={index >= tracks.length - 1}
          aria-label={hi ? "अगली खबर" : "Next headline"}
        >
          ›
        </button>
        <button
          type="button"
          className="hl-mini__close tap-target"
          onClick={clearPlaylist}
          aria-label={hi ? "प्लेयर बंद करें" : "Close player"}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
