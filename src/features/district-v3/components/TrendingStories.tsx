import { SectionHeader } from "@/design-system/components/SectionHeader";
import { NewsCard } from "@/design-system/components/NewsCard";
import { EmptyState } from "@/design-system/components/EmptyState";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";
import { DistrictCard } from "./DistrictCard";

export type TrendingStoriesProps = {
  articles: HomeArticle[];
};

export function TrendingStories({ articles }: TrendingStoriesProps) {
  const { language } = useLanguage();
  const trending = articles.filter((a) => a.ranking?.isTrending ?? a.trendScore > 0);
  const display = (trending.length > 0 ? trending : articles).slice(0, 6);

  return (
    <DistrictCard id="dv3-trending" aria-labelledby="dv3-trending-title">
      <SectionHeader title="Trending stories" kicker="In your district" />
      <h2 id="dv3-trending-title" className="sr-only">
        Trending district stories
      </h2>

      {display.length === 0 ? (
        <EmptyState
          title="No stories yet"
          description="Trending stories from your district will appear here."
          icon="🔥"
        />
      ) : (
        <div className="dv3-trending">
          {display.map((article) => (
            <NewsCard
              key={article.id}
              headline={article.headline}
              excerpt={article.summary}
              imageUrl={article.imageUrl}
              publishedAt={formatHomeTime(article.publishedAt, language)}
              readTime={article.readingTime}
              layout="horizontal"
              href={`/story/${article.slug}`}
              category={article.ranking?.isTrending ? "Trending" : undefined}
              categoryVariant="breaking"
            />
          ))}
        </div>
      )}
    </DistrictCard>
  );
}
