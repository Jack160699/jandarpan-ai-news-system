import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { categoryLabel } from "@/lib/live-news-display";
import { resolveCardImage } from "@/lib/news/images/display";
import { isArticleLive } from "@/lib/news/home-ranking";
import { resolveArticleProvider } from "@/lib/news/article-provider";
import { resolveStorySlug } from "@/lib/news/related-stories";
import { estimateReadTime } from "@/lib/news/story-utils";
import { mapProviderToDesk } from "@/lib/newsroom/desk-branding";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type StoryRelatedGridProps = {
  articles: NewsArticleRow[];
};

export function StoryRelatedGrid({ articles }: StoryRelatedGridProps) {
  if (!articles.length) return null;

  return (
    <section
      className="immersive-related immersive-related--premium"
      aria-labelledby="story-related-title"
    >
      <header className="immersive-related__head">
        <h2 id="story-related-title" className="immersive-related__title">
          Related stories
        </h2>
        <p className="immersive-related__sub">संबंधित खबरें</p>
      </header>

      <div
        className="immersive-related__rail"
        role="list"
        aria-label="Related stories carousel"
      >
        {articles.map((article) => {
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
          const readTime = estimateReadTime(
            `${article.title} ${article.content ?? article.description ?? ""}`
          );
          const live = isArticleLive(article.published_at);

          return (
            <Link
              key={article.id}
              href={`/story/${slug}`}
              className="immersive-related__card immersive-related__card--premium"
              role="listitem"
            >
              <div className="immersive-related__visual">
                <HomeArticleImage
                  src={image}
                  alt=""
                  sizes="(max-width:640px) 72vw, 280px"
                />
                {live ? (
                  <span className="immersive-related__live">Live</span>
                ) : null}
              </div>
              <div className="immersive-related__body">
                <span className="immersive-related__cat">
                  {categoryLabel(article.category as NewsCategory)}
                </span>
                <p className="immersive-related__headline">
                  {article.ai_headline ?? article.title}
                </p>
                <p className="immersive-related__meta">
                  {mapProviderToDesk(resolveArticleProvider(article)).name} ·{" "}
                  {readTime}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="immersive-related__grid immersive-related__grid--desktop">
        {articles.slice(0, 6).map((article) => {
          const slug = resolveStorySlug(article);
          const image = resolveCardImage(
            {
              imageUrl: article.image_url,
              category: article.category,
              source: article.source,
              articleUrl: article.article_url,
            },
            320
          );
          const readTime = estimateReadTime(
            `${article.title} ${article.content ?? article.description ?? ""}`
          );

          return (
            <Link
              key={`desk-${article.id}`}
              href={`/story/${slug}`}
              className="immersive-related__card immersive-related__card--row"
            >
              <div className="immersive-related__thumb">
                <HomeArticleImage src={image} alt="" sizes="88px" />
              </div>
              <div>
                <p className="immersive-related__headline">
                  {article.ai_headline ?? article.title}
                </p>
                <p className="immersive-related__meta">
                  {categoryLabel(article.category as NewsCategory)} ·{" "}
                  {readTime}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
