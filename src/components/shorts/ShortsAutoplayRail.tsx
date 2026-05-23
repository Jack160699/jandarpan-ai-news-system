"use client";

import Link from "next/link";
import { useState } from "react";
import { NewsShortCard } from "@/components/shorts/NewsShortCard";
import type { NewsShortCard as ShortCardType } from "@/lib/news/shorts/types";

type ShortsAutoplayRailProps = {
  shorts: ShortCardType[];
  title?: string;
  titleHi?: string;
};

export function ShortsAutoplayRail({
  shorts,
  title = "News Shorts",
  titleHi = "60 सेकंड समाचार",
}: ShortsAutoplayRailProps) {
  const [activeId, setActiveId] = useState(shorts[0]?.articleId ?? "");
  if (!shorts.length) return null;

  const featured = shorts.slice(0, 5);

  return (
    <section className="shorts-rail" aria-labelledby="shorts-rail-title">
      <div className="nr-wrap shorts-rail__header">
        <div>
          <p className="nr-kicker">60 sec · AI voice</p>
          <h2 id="shorts-rail-title" className="nr-section-title">
            {title}
          </h2>
          <p className="text-sm text-neutral-500">{titleHi}</p>
        </div>
        <Link href="/shorts" className="shorts-rail__cta tap-target">
          View all →
        </Link>
      </div>
      <div className="shorts-rail__scroll">
        {featured.map((short) => (
          <div key={short.articleId} className="shorts-rail__slot">
            <NewsShortCard
              short={short}
              active={activeId === short.articleId}
              onActivate={() => setActiveId(short.articleId)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
