"use client";

import { useEffect } from "react";
import { HeadlinesListenPlayer } from "@/components/listen/HeadlinesListenPlayer";
import { buildHeadlinePlaylist } from "@/lib/listen/build-playlist";
import { useHeadlinesListen } from "@/providers/HeadlinesListenProvider";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ListenPageClientProps = {
  shorts: NewsShortCard[];
  autoPlay?: boolean;
};

export function ListenPageClient({ shorts, autoPlay = false }: ListenPageClientProps) {
  const { initPlaylist, tracks, play } = useHeadlinesListen();
  const playlist = buildHeadlinePlaylist(shorts);

  useEffect(() => {
    if (!playlist.length) return;
    if (tracks.length === 0) {
      initPlaylist(playlist, 0);
      if (autoPlay) play();
    }
  }, [playlist, tracks.length, initPlaylist, autoPlay, play]);

  return (
    <div className="listen-page">
      {playlist.length === 0 ? (
        <div className="listen-page__empty rounded-xl border border-dashed border-[var(--rule)] p-8 text-center">
          <h2 className="text-lg font-semibold">No headlines to play yet</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Check back when today&apos;s edition is published, or browse live updates.
          </p>
          <a
            href="/live"
            className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[var(--rule-strong)] px-5 text-sm font-semibold tap-target"
          >
            Go to live desk
          </a>
        </div>
      ) : (
        <>
          <HeadlinesListenPlayer />
          <ol className="listen-page__queue">
            {playlist.map((t, i) => (
              <li key={t.id} className="listen-page__queue-item">
                <span className="listen-page__queue-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="listen-page__queue-title" lang={t.language === "hi" ? "hi" : undefined}>
                  {t.headline}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
