"use client";

import Link from "next/link";
import { Headphones, Play } from "lucide-react";
import { buildHeadlinePlaylist } from "@/lib/listen/build-playlist";
import { restoreTopTenLauncher } from "@/lib/listen/events";
import { formatDuration } from "@/lib/listen/narrator";
import { selectDiverseTopTen } from "@/lib/listen/top-ten";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { useHeadlinesListen } from "@/providers/HeadlinesListenProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";

export function TopTenAudioSection({ shorts }: { shorts: NewsShortCard[] }) {
  const audio = useHeadlinesListen();
  const { language } = useLanguage();
  const playlist = buildHeadlinePlaylist(selectDiverseTopTen(shorts, 10));
  if (!playlist.length) return null;
  const total = playlist.reduce((sum, track) => sum + track.durationSec, 0);

  const play = () => {
    restoreTopTenLauncher();
    audio.initPlaylist(playlist, 0);
    audio.play();
  };

  return (
    <section className="home-v31__section top-ten-module" aria-labelledby="top-ten-module-title">
      <span className="top-ten-module__icon" aria-hidden><Headphones size={23} /></span>
      <div className="top-ten-module__copy">
        <p>JAN DARPAN AUDIO</p>
        <h2 id="top-ten-module-title">
          {pickBilingualLabel(language, "Listen to today's Top 10", "आज की Top 10 खबरें सुनें")}
        </h2>
        <span>
          {playlist.length} {pickBilingualLabel(language, "headlines", "खबरें")} ·{" "}
          {pickBilingualLabel(language, "about", "लगभग")} {formatDuration(total)}
        </span>
      </div>
      <button
        type="button"
        onClick={play}
        aria-label={pickBilingualLabel(language, "Play today's Top 10 headlines", "आज की Top 10 खबरें चलाएं")}
      >
        <Play size={18} aria-hidden /> {pickBilingualLabel(language, "Play", "चलाएं")}
      </button>
      <Link href="/listen">
        {pickBilingualLabel(language, "Open full player", "पूरा प्लेयर खोलें")}
      </Link>
    </section>
  );
}
