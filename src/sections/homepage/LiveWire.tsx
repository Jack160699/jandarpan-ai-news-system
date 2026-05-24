"use client";

import Link from "next/link";
import { LiveWireFeed } from "@/components/live-desk/LiveWireFeed";
import { Reveal } from "@/components/motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveWireProps = {
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
  /** Nested in home-desk-split column — tighter padding, no duplicate page anchor */
  embedded?: boolean;
};

export function LiveWire({ items, freshIds, embedded }: LiveWireProps) {
  const { t } = useLanguage();
  if (!items.length) return null;

  return (
    <Reveal
      as="section"
      id={embedded ? undefined : "wire"}
      className={`live-wire live-wire--daily scroll-mt-24${embedded ? " live-wire--embedded" : ""}`}
      aria-labelledby="nr-wire-title"
    >
      <div
        className={`${embedded ? "" : "nr-wrap "}live-wire__head live-wire__head--daily`.trim()}
      >
        <h2 id="nr-wire-title" className="live-wire__title">
          {t.home.nationalHighlights}
        </h2>
        <Link href="/live" className="live-wire__cta tap-target">
          {t.live.viewAll} →
        </Link>
      </div>

      <div className={embedded ? "" : "nr-wrap"}>
        <LiveWireFeed
          items={items.slice(0, 6)}
          variant="feed"
          freshIds={freshIds}
        />
      </div>
    </Reveal>
  );
}
