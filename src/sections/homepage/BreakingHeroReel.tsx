"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { NewsShortCard } from "@/lib/news/shorts/types";

const NewsShortCard = dynamic(
  () =>
    import("@/components/shorts/NewsShortCard").then((m) => ({
      default: m.NewsShortCard,
    })),
  {
    loading: () => (
      <div
        className="nr-hero-reel__placeholder aspect-[9/14] w-full rounded-lg"
        aria-hidden
      />
    ),
  }
);

type BreakingHeroReelProps = {
  short: NewsShortCard;
};

export function BreakingHeroReel({ short }: BreakingHeroReelProps) {
  return (
    <div className="nr-hero-reel nr-hero-reel--daily">
      <Link href="/shorts" className="nr-hero-reel__label tap-target">
        Watch reel →
      </Link>
      <div className="nr-hero-reel__card">
        <NewsShortCard short={short} active autoplay />
      </div>
    </div>
  );
}
