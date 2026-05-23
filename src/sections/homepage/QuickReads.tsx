import Link from "next/link";
import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { HomeArticle } from "@/lib/homepage/types";

type QuickReadsProps = {
  articles: HomeArticle[];
};

export function QuickReads({ articles }: QuickReadsProps) {
  if (!articles.length) return null;

  return (
    <section
      className="nr-section"
      aria-labelledby="nr-shorts-title"
    >
      <div className="nr-wrap">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader
            id="nr-shorts-title"
            kicker="2 min reads"
            title="Quick reads"
            titleHi="झटपट पढ़ें"
          />
          <Link
            href="/shorts"
            className="text-sm font-semibold text-[var(--brand-maroon,#8b1538)] tap-target shrink-0"
          >
            60s shorts →
          </Link>
        </div>
      </div>

      <div
        className="nr-shorts__scroll"
        role="list"
        aria-label="Quick read stories"
      >
        {articles.map((article) => (
          <div key={article.id} role="listitem" className="nr-shorts__slot">
            <StoryCard article={article} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
