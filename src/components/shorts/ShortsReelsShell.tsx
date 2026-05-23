"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShortsVerticalFeed } from "@/components/shorts/ShortsVerticalFeed";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortsReelsShellProps = {
  shorts: NewsShortCard[];
};

export function ShortsReelsShell({ shorts }: ShortsReelsShellProps) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start") ?? undefined;

  return (
    <div className="reels-page">
      <header className="reels-page__chrome">
        <Link href="/" className="reels-page__back tap-target">
          ← होम
        </Link>
        <div className="reels-page__title">
          <span className="reels-page__title-hi">रील्स</span>
          <span className="reels-page__title-en">News Shorts</span>
        </div>
        <span className="reels-page__count">{shorts.length}</span>
      </header>
      <ShortsVerticalFeed shorts={shorts} initialSlug={start} />
    </div>
  );
}
