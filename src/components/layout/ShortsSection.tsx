"use client";

import { memo, useState } from "react";
import { HorizontalLazyRail } from "@/components/homepage/HorizontalLazyRail";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { ShortPreviewCard } from "@/components/shorts/ShortPreviewCard";
import { useLanguage } from "@/providers/LanguageProvider";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortsSectionProps = {
  shorts: NewsShortCard[];
};

const ShortSlot = memo(function ShortSlot({
  short,
  active,
  index,
  onActivate,
}: {
  short: NewsShortCard;
  active: boolean;
  index: number;
  onActivate: () => void;
}) {
  return (
    <ShortPreviewCard
      short={short}
      active={active}
      index={index}
      onActivate={onActivate}
    />
  );
});

export function ShortsSection({ shorts }: ShortsSectionProps) {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState(shorts[0]?.articleId ?? "");
  if (!shorts.length) return null;

  const featured = shorts.slice(0, 8);

  return (
    <section
      id="shorts"
      className="shorts-section shorts-section--cinematic hp-section hp-section--secondary pl-scroll-target"
      aria-labelledby="shorts-section-title"
    >
      <div className="pl-container">
        <SectionHeader
          id="shorts-section-title"
          title={t.shorts.title}
          titleHi="रील्स"
          description={t.shorts.subtitle}
          href="/shorts"
          hrefLabel={t.common.seeAll}
        />
      </div>
      <HorizontalLazyRail
        items={featured}
        getKey={(short) => short.articleId}
        ariaLabel={t.shorts.feedAria}
        className="shorts-section__rail shorts-section__rail--snap"
        slotClassName="shorts-section__slot shorts-section__slot--reel"
        initialCount={4}
        batchSize={2}
        renderItem={(short, index) => (
          <ShortSlot
            short={short}
            index={index}
            active={activeId === short.articleId}
            onActivate={() => setActiveId(short.articleId)}
          />
        )}
      />
    </section>
  );
}
