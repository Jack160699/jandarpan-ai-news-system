"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeadlinesWaveform } from "@/components/listen/HeadlinesWaveform";
import { buildHeadlinePlaylist } from "@/lib/listen/build-playlist";
import { formatDuration } from "@/lib/listen/narrator";
import { useHeadlinesListenOptional } from "@/providers/HeadlinesListenProvider";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ListenHeadlinesPromoProps = {
  shorts: NewsShortCard[];
};

export function ListenHeadlinesPromo({ shorts }: ListenHeadlinesPromoProps) {
  const router = useRouter();
  const listen = useHeadlinesListenOptional();
  const tracks = buildHeadlinePlaylist(shorts.slice(0, 10));
  if (!tracks.length) return null;

  const totalSec = tracks.reduce((n, t) => n + t.durationSec, 0);
  const lead = tracks[0]!;

  const startListening = () => {
    listen?.initPlaylist(tracks, 0);
    listen?.play();
    router.push("/listen");
  };

  return (
    <section className="hl-promo" aria-labelledby="hl-promo-title">
      <div className="nr-wrap hl-promo__inner">
        <div className="hl-promo__copy">
          <p className="hl-promo__kicker">
            <span className="hl-promo__dot" aria-hidden />
            Audio briefing
          </p>
          <h2 id="hl-promo-title" className="hl-promo__title">
            Listen to Today&apos;s Headlines
          </h2>
          <p className="hl-promo__sub">
            आज की मुख्य खबरें सुनें — हिंदी में, छत्तीसगढ़ ब्यूरो की आवाज़ में
          </p>
          <p className="hl-promo__meta">
            {tracks.length} headlines · ~{formatDuration(totalSec)}
          </p>
          <div className="hl-promo__actions">
            <button
              type="button"
              className="hl-promo__cta hl-promo__cta--primary tap-target"
              onClick={startListening}
            >
              <span aria-hidden>▶</span> Play now
            </button>
            <Link href="/listen" className="hl-promo__cta hl-promo__cta--ghost tap-target">
              Open player
            </Link>
          </div>
        </div>

        <div className="hl-promo__card">
          <HeadlinesWaveform active className="hl-promo__wave" />
          <p className="hl-promo__now" lang={lead.language === "hi" ? "hi" : undefined}>
            {lead.headline}
          </p>
          <p className="hl-promo__narrator">प्रिया · छत्तीसगढ़ ब्यूरो</p>
        </div>
      </div>
    </section>
  );
}
