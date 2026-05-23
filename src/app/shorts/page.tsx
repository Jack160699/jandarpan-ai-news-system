import type { Metadata } from "next";
import Link from "next/link";
import { ShortsVerticalFeed } from "@/components/shorts/ShortsVerticalFeed";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";
import { BRAND } from "@/lib/brand";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `News Shorts · ${BRAND.nameEn}`,
  description:
    "60-second AI news summaries with voice narration, subtitles, and vertical reels for mobile.",
};

export default async function ShortsPage() {
  const shorts = await fetchShortsPool(20);

  return (
    <div className="shorts-page">
      <header className="shorts-page__header">
        <Link href="/" className="shorts-page__back">
          ← Edition
        </Link>
        <span className="font-semibold">News Shorts</span>
        <span className="text-xs text-slate-400">60s</span>
      </header>
      <ShortsVerticalFeed shorts={shorts} />
    </div>
  );
}
