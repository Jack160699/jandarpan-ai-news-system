import type { Article } from "@/lib/articles";
import { getFeedStory } from "@/lib/home-feed";

type ArticleMetaBarProps = {
  article: Article;
};

export function ArticleMetaBar({ article }: ArticleMetaBarProps) {
  const feed = getFeedStory(article.slug);
  const filedAt = feed?.filedAt ?? "Today";
  const city = feed?.city ?? article.filedFrom.replace(/^Filed from\s*/i, "").split("·")[0]?.trim();

  return (
    <div className="article-meta-bar" role="group" aria-label="Article metadata">
      <span>
        <span className="article-meta-bar__author">{article.author}</span>
        {article.role ? (
          <span className="article-meta-bar__role"> · {article.role}</span>
        ) : null}
      </span>
      <span className="article-meta-bar__dot" aria-hidden>
        ·
      </span>
      <span className="article-meta-bar__muted">{filedAt}</span>
      {city ? (
        <>
          <span className="article-meta-bar__dot" aria-hidden>
            ·
          </span>
          <span className="article-meta-bar__muted">{city}</span>
        </>
      ) : null}
      <span className="article-meta-bar__dot" aria-hidden>
        ·
      </span>
      <span className="article-meta-bar__muted">{article.readTime}</span>
      <span className="article-meta-bar__dot" aria-hidden>
        ·
      </span>
      <span className="article-meta-bar__muted">{article.category}</span>
    </div>
  );
}
