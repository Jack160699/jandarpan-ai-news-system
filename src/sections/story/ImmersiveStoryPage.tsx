import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { StoryReaderShell } from "@/components/story/StoryReaderShell";
import { StoryAnalyticsTracker } from "@/components/story/StoryAnalyticsTracker";
import { StoryBody } from "@/components/story/StoryBody";
import { StoryHeroImage } from "@/components/story/StoryHeroImage";
import { StoryRelatedGrid } from "@/components/story/StoryRelatedGrid";
import { StoryTimeline } from "@/components/story/StoryTimeline";
import { categoryLabel } from "@/lib/live-news-display";
import { isArticleLive } from "@/lib/news/home-ranking";
import { resolveCardImage } from "@/lib/news/images/display";
import { resolveStorySlug } from "@/lib/news/related-stories";
import {
  buildTimelineFromSections,
  parseStoryMarkdown,
} from "@/lib/news/story-markdown";
import { estimateReadTime, storyBodyParagraphs } from "@/lib/news/story-utils";
import { formatPublishedAt } from "@/lib/news-db";
import { SITE_URL } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type ImmersiveStoryPageProps = {
  article: NewsArticleRow;
  related: NewsArticleRow[];
};

export function ImmersiveStoryPage({
  article,
  related,
}: ImmersiveStoryPageProps) {
  const slug = resolveStorySlug(article);
  const canonicalUrl = `${SITE_URL}/story/${slug}`;
  const category = article.category as NewsCategory;
  const heroImage = resolveCardImage(
    {
      imageUrl: article.image_url,
      category: article.category,
      source: article.source,
      articleUrl: article.article_url,
    },
    1400
  );

  const isLive = isArticleLive(article.published_at);
  const bodyRaw = article.content ?? "";
  const parsed = parseStoryMarkdown(bodyRaw);
  const plainParagraphs =
    parsed.plainParagraphs.length > 0
      ? parsed.plainParagraphs
      : storyBodyParagraphs(article);
  const sections =
    parsed.sections.length > 0 ? parsed.sections : [];
  const timeline = buildTimelineFromSections(sections);

  const readTime = estimateReadTime(
    `${article.title} ${bodyRaw || article.description || ""}`
  );

  const aiSummary =
    article.ai_summary?.trim() ||
    article.description?.trim() ||
    null;

  const subtitle = article.description?.trim() || null;

  const regionLabel =
    article.region === "chhattisgarh"
      ? "Chhattisgarh"
      : article.region === "india"
        ? "India"
        : "Global";

  return (
    <>
      <LiveStoryJsonLd article={article} />
      <StoryAnalyticsTracker
        slug={slug}
        source={article.source}
        category={article.category}
        provider={article.provider}
      />

      <article className="immersive-story" data-reading="article">
        <div className="immersive-story__shell">
          <StoryReaderShell
            slug={slug}
            title={article.title}
            url={canonicalUrl}
            readTime={readTime}
          />

          <header className="immersive-story__header">
            <p className="immersive-story__kicker">
              {categoryLabel(category)} · {regionLabel}
            </p>
            <h1 className="immersive-story__headline">{article.title}</h1>
            {subtitle && subtitle !== aiSummary ? (
              <p className="immersive-story__subtitle">{subtitle}</p>
            ) : null}
            <div className="immersive-story__meta">
              {isLive ? (
                <span className="immersive-story__live">
                  <span className="immersive-story__live-dot" aria-hidden />
                  Live
                </span>
              ) : null}
              <span>{readTime}</span>
              <span aria-hidden>·</span>
              <time dateTime={article.published_at ?? undefined}>
                {formatPublishedAt(article.published_at)}
              </time>
              <span aria-hidden>·</span>
              <span>{BRAND.nameEn} editorial</span>
            </div>
          </header>

          <StoryHeroImage src={heroImage} />

          {aiSummary ? (
            <aside className="immersive-summary" aria-label="AI summary">
              <p className="immersive-summary__label">Editorial summary</p>
              <p className="immersive-summary__text">{aiSummary}</p>
            </aside>
          ) : null}

          <StoryBody
            sections={sections}
            plainParagraphs={plainParagraphs}
          />

          <StoryTimeline events={timeline} />

          <StoryRelatedGrid articles={related} />
        </div>
      </article>
    </>
  );
}
