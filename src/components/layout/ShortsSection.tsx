"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { HorizontalLazyRail } from "@/components/homepage/HorizontalLazyRail";
import { ShortPreviewCard } from "@/components/shorts/ShortPreviewCard";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortsSectionProps = {
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

export function ShortsSection({ shorts }: ShortsSectionProps) {
  const [activeId, setActiveId] = useState(shorts[0]?.articleId ?? "");
  if (!shorts.length) return null;

  const featured = shorts.slice(0, 6);

  return (
    <section
      id="shorts"
      className="shorts-section pl-scroll-target"
      aria-labelledby="shorts-section-title"
    >
      <header className="shorts-section__header pl-container">
        <h2 id="shorts-section-title" className="shorts-section__title hi">
          Shorts · रील्स
        </h2>
        <Link href="/shorts" className="shorts-section__cta" prefetch={false}>
          All →
        </Link>
      </header>
      <HorizontalLazyRail
        items={featured}
        getKey={(short) => short.articleId}
        ariaLabel="News shorts"
        className="shorts-section__rail"
        slotClassName="shorts-section__slot"
        initialCount={4}
        batchSize={2}
        renderItem={(short) => (
          <ShortSlot
            short={short}
            active={activeId === short.articleId}
            onActivate={() => setActiveId(short.articleId)}
          />
        )}
      />
    </section>
  );
}
