import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { categoryLabel } from "@/lib/live-news-display";
import { resolveCardImage } from "@/lib/news/images/display";
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
    <section className="immersive-related" aria-labelledby="story-related-title">
      <h2 id="story-related-title" className="immersive-related__title">
        Related stories
      </h2>
      <div className="immersive-related__grid">
        {articles.map((article) => {
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
              key={article.id}
              href={`/story/${slug}`}
              className="immersive-related__card group"
            >
              <div className="immersive-related__thumb">
                <HomeArticleImage
                  src={image}
                  alt=""
                  sizes="88px"
                />
              </div>
              <div>
                <p className="immersive-related__headline group-hover:opacity-85">
                  {article.ai_headline ?? article.title}
                </p>
                <p className="immersive-related__meta">
                  {categoryLabel(article.category as NewsCategory)} ·{" "}
                  {mapProviderToDesk(resolveArticleProvider(article)).name} · {readTime}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
