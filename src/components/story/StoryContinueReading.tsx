import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { categoryLabel } from "@/lib/live-news-display";
import { resolveCardImage } from "@/lib/news/images/display";
import { resolveStorySlug } from "@/lib/news/related-stories";
import type { InternalLink } from "@/lib/seo/internal-links";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type StoryContinueReadingProps = {
  related: NewsArticleRow[];
  hubLinks: InternalLink[];
};

export function StoryContinueReading({
  related,
  hubLinks,
}: StoryContinueReadingProps) {
  const cards = related.slice(0, 4);
  const hubs = hubLinks.slice(0, 4);

  if (!cards.length && !hubs.length) return null;

  return (
    <section
      className="story-continue"
      aria-labelledby="story-continue-title"
    >
      <header className="story-continue__head">
        <h2 id="story-continue-title" className="story-continue__title">
          Continue reading
        </h2>
        <p className="story-continue__sub">आगे पढ़ें · More from the desk</p>
      </header>

      {cards.length > 0 ? (
        <div className="story-continue__grid" role="list">
          {cards.map((article) => {
            const slug = resolveStorySlug(article);
            const image = resolveCardImage(
              {
                imageUrl: article.image_url,
                category: article.category,
                source: article.source,
                articleUrl: article.article_url,
              },
              480
            );

            return (
              <Link
                key={article.id}
                href={`/story/${slug}`}
                className="story-continue__card"
                role="listitem"
              >
                <div className="story-continue__visual">
                  <HomeArticleImage src={image} alt="" sizes="(max-width:640px) 80vw, 320px" />
                  <div className="story-continue__visual-shade" aria-hidden />
                </div>
                <div className="story-continue__body">
                  <span className="story-continue__cat">
                    {categoryLabel(article.category as NewsCategory)}
                  </span>
                  <h3 className="story-continue__headline">
                    {article.ai_headline ?? article.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {hubs.length > 0 ? (
        <ul className="story-continue__hubs">
          {hubs.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="story-continue__hub-link">
                {link.labelHi ?? link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
