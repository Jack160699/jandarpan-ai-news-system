import { StoryFeedCard } from "@/components/story/StoryFeedCard";
import { mapNewsArticleToStoryFeedCard } from "@/lib/news/story-feed-card";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { NewsArticleRow } from "@/lib/types/news-article";

type StoryRelatedGridProps = {
  articles: NewsArticleRow[];
  language: NewsroomLanguage;
  title: string;
  subtitle: string;
};

export function StoryRelatedGrid({
  articles,
  language,
  title,
  subtitle,
}: StoryRelatedGridProps) {
  if (!articles.length) return null;

  return (
    <section
      className="immersive-related immersive-related--premium immersive-related--editorial"
      aria-labelledby="story-related-title"
    >
      <header className="story-section-header immersive-related__head">
        <h2
          id="story-related-title"
          className="story-section-header__title immersive-related__title"
        >
          {title}
        </h2>
        <p className="story-section-header__subtitle immersive-related__sub">
          {subtitle}
        </p>
      </header>

      <div
        className="immersive-related__rail"
        role="list"
        aria-label={title}
      >
        {articles.map((article, index) => (
          <div key={article.id} role="listitem">
            <StoryFeedCard
              card={mapNewsArticleToStoryFeedCard(article, language, 480)}
              variant="rail"
              imageSizes="(max-width:640px) 72vw, 280px"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      <div className="immersive-related__grid immersive-related__grid--desktop">
        {articles.slice(0, 6).map((article) => (
          <StoryFeedCard
            key={`desk-${article.id}`}
            card={mapNewsArticleToStoryFeedCard(article, language, 320)}
            variant="row"
            imageSizes="88px"
          />
        ))}
      </div>
    </section>
  );
}
