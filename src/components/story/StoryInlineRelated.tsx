import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { categoryLabel } from "@/lib/live-news-display";
import { resolveCardImage } from "@/lib/news/images/display";
import { resolveStorySlug } from "@/lib/news/related-stories";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type StoryInlineRelatedProps = {
  articles: NewsArticleRow[];
  title?: string;
};

export function StoryInlineRelated({
  articles,
  title = "संबंधित खबरें",
}: StoryInlineRelatedProps) {
  if (!articles.length) return null;

  return (
    <aside className="story-inline-related" aria-labelledby="story-inline-related-title">
      <h3 id="story-inline-related-title" className="story-inline-related__title">
        {title}
      </h3>
      <div className="story-inline-related__rail" role="list">
        {articles.map((article) => {
          const slug = resolveStorySlug(article);
          const image = resolveCardImage(
            {
              imageUrl: article.image_url,
              category: article.category,
              source: article.source,
              articleUrl: article.article_url,
            },
            400
          );

          return (
            <Link
              key={article.id}
              href={`/story/${slug}`}
              className="story-inline-related__card"
              role="listitem"
            >
              <div className="story-inline-related__thumb">
                <HomeArticleImage src={image} alt="" sizes="160px" />
              </div>
              <div className="story-inline-related__body">
                <span className="story-inline-related__cat">
                  {categoryLabel(article.category as NewsCategory)}
                </span>
                <p className="story-inline-related__headline">
                  {article.ai_headline ?? article.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
