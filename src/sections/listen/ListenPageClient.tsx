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
    </div>
  );
}
