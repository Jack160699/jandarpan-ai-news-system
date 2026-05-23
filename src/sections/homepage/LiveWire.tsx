"use client";

import Link from "next/link";
import { LiveWireFeed } from "@/components/live-desk/LiveWireFeed";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveWireProps = {
  items: HomeArticle[];
};

export function LiveWire({ items }: LiveWireProps) {
  const { t } = useLanguage();
  if (!items.length) return null;

  return (
    <section
      id="wire"
      className="live-wire live-wire--daily scroll-mt-24"
      aria-labelledby="nr-wire-title"
    >
      <div className="nr-wrap live-wire__head live-wire__head--daily">
        <h2 id="nr-wire-title" className="live-wire__title">
          {t.home.wire}
        </h2>
        <Link href="/live" className="live-wire__cta tap-target">
          {t.live.viewAll} →
        </Link>
      </div>

      <div className="nr-wrap">
        <LiveWireFeed items={items.slice(0, 6)} variant="feed" />
      </div>
    </section>
  );
}
