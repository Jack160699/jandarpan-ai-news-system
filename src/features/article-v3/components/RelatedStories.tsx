import { EmptyState, NewsCard, SectionHeader } from "@/design-system";
import { mapNewsArticleToStoryFeedCard } from "@/lib/news/story-feed-card";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { NewsArticleRow } from "@/lib/types/news-article";

type RelatedStoriesProps = {
  articles: NewsArticleRow[];
  language: NewsroomLanguage;
  title: string;
  subtitle?: string | null;
};

export function RelatedStories({
  articles,
  language,
  title,
  subtitle,
}: RelatedStoriesProps) {
  if (!articles.length) return null;

  return (
    <section
      className="article-v3__section"
      aria-labelledby="article-v3-related-title"
    >
      <SectionHeader title={title} kicker={subtitle ?? undefined} />
      <div className="article-v3-grid" role="list">
        {articles.map((article) => {
          const card = mapNewsArticleToStoryFeedCard(article, language, 480);
          return (
            <div key={article.id} role="listitem">
              <NewsCard
                headline={card.headline}
                imageUrl={card.imageUrl}
                imageAlt=""
                category={card.categoryLabel}
                categoryVariant={card.isLive ? "breaking" : "default"}
                readTime={card.metaLabel}
                href={card.href}
                layout="vertical"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RelatedStoriesEmpty({
  title = "Related stories",
}: {
  title?: string;
}) {
  return (
    <section className="article-v3__section" aria-labelledby="article-v3-related-empty">
      <SectionHeader title={title} />
      <EmptyState
        title="No related stories"
        description="Check back later for more coverage on this topic."
      />
    </section>
  );
}
