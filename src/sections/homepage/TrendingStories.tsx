import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { HomeArticle } from "@/lib/homepage/types";

type TrendingStoriesProps = {
  articles: HomeArticle[];
};

export function TrendingStories({ articles }: TrendingStoriesProps) {
  if (!articles.length) return null;

  return (
    <section
      className="nr-section"
      aria-labelledby="nr-trending-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-trending-title"
          kicker="Ranked now"
          title="Trending stories"
          titleHi="ट्रेंडिंग"
        />

        <ol className="nr-trending__list">
          {articles.map((article, index) => (
            <li key={article.id} className="nr-trending__item">
              <StoryCard
                article={article}
                variant="trending"
                rank={index + 1}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
