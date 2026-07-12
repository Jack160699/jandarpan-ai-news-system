import Link from "next/link";
import { StoryFeedCard } from "@/components/story/StoryFeedCard";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { mapNewsArticleToStoryFeedCard } from "@/lib/news/story-feed-card";
import type { InternalLink } from "@/lib/seo/internal-links";
import type { NewsArticleRow } from "@/lib/types/news-article";

type StoryContinueReadingProps = {
  related: NewsArticleRow[];
  hubLinks: InternalLink[];
  language: NewsroomLanguage;
  title: string;
  subtitle: string;
};

export function StoryContinueReading({
  related,
  hubLinks,
  language,
  title,
  subtitle,
}: StoryContinueReadingProps) {
  const cards = related.slice(0, 4);
  const hubs = hubLinks.slice(0, 4);

  if (!cards.length && !hubs.length) return null;

  return (
    <section className="story-continue" aria-labelledby="story-continue-title">
      <header className="story-section-header story-continue__head">
        <h2
          id="story-continue-title"
          className="story-section-header__title story-continue__title"
        >
          {title}
        </h2>
        <p className="story-section-header__subtitle story-continue__sub">
          {subtitle}
        </p>
      </header>

      {cards.length > 0 ? (
        <div className="story-continue__grid" role="list">
          {cards.map((article, index) => (
            <div key={article.id} role="listitem">
              <StoryFeedCard
                card={mapNewsArticleToStoryFeedCard(article, language, 480)}
                variant="grid"
                imageSizes="(max-width:640px) 80vw, 320px"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      ) : null}

      {hubs.length > 0 ? (
        <ul className="story-continue__hubs">
          {hubs.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="story-continue__hub-link">
                {pickBilingualLabel(
                  language,
                  link.label,
                  link.labelHi ?? link.label
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
