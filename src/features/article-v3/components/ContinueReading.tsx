import Link from "next/link";
import { EmptyState, NewsCard, SectionHeader } from "@/design-system";
import { mapNewsArticleToStoryFeedCard } from "@/lib/news/story-feed-card";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { InternalLink } from "@/lib/seo/internal-links";
import type { NewsArticleRow } from "@/lib/types/news-article";

type ContinueReadingProps = {
  related: NewsArticleRow[];
  hubLinks: InternalLink[];
  language: NewsroomLanguage;
  title: string;
  subtitle: string;
};

export function ContinueReading({
  related,
  hubLinks,
  language,
  title,
  subtitle,
}: ContinueReadingProps) {
  const cards = related.slice(0, 4);
  const hubs = hubLinks.slice(0, 4);

  if (!cards.length && !hubs.length) return null;

  return (
    <section
      className="article-v3__section"
      aria-labelledby="article-v3-continue-title"
    >
      <SectionHeader title={title} kicker={subtitle} />
      {cards.length > 0 ? (
        <div className="article-v3-grid" role="list">
          {cards.map((article) => {
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
      ) : (
        <EmptyState
          title="Nothing to continue"
          description="Read more stories to build your reading history."
        />
      )}
      {hubs.length > 0 ? (
        <nav aria-label="Related topics">
          <ul className="article-v3-district__topics">
            {hubs.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="article-v3-district__link">
                  {pickBilingualLabel(language, link.label, link.labelHi ?? link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
