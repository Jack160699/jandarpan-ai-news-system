"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { HorizontalLazyRail } from "@/components/homepage/HorizontalLazyRail";
import { Reveal } from "@/components/motion";
import { ShortPreviewCard } from "@/components/shorts/ShortPreviewCard";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type TrendingShortsRailProps = {
  shorts: NewsShortCard[];
};

const ShortSlot = memo(function ShortSlot({
  short,
  active,
  onActivate,
}: {
  short: NewsShortCard;
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <ShortPreviewCard short={short} active={active} onActivate={onActivate} />
  );
});

export function TrendingShortsRail({ shorts }: TrendingShortsRailProps) {
  const [activeId, setActiveId] = useState(shorts[0]?.articleId ?? "");
  if (!shorts.length) return null;

  const featured = shorts.slice(0, 6);

  return (
    <Reveal
      as="section"
      id="reels"
      className="trending-shorts trending-shorts--daily scroll-mt-24"
      aria-labelledby="trending-shorts-title"
    >
      <div className="nr-wrap trending-shorts__header trending-shorts__header--daily">
        <h2 id="trending-shorts-title" className="trending-shorts__title">
          Watch <span className="trending-shorts__title-hi">· रील्स</span>
        </h2>
        <Link href="/shorts" className="trending-shorts__cta tap-target" prefetch={false}>
          All →
        </Link>
      </div>

      <HorizontalLazyRail
        items={featured}
        getKey={(short) => short.articleId}
        ariaLabel="News reels"
        className="trending-shorts__scroll motion-rail"
        slotClassName="trending-shorts__slot"
        initialCount={3}
        batchSize={3}
        renderItem={(short) => (
          <ShortSlot
            short={short}
            active={activeId === short.articleId}
            onActivate={() => setActiveId(short.articleId)}
          />
        )}
      />
    </Reveal>
  );
}
