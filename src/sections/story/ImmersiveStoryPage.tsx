import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { StoryBreadcrumbs } from "@/components/seo/StoryBreadcrumbs";
import { StoryAttribution } from "@/components/story/StoryAttribution";
import { StoryBody } from "@/components/story/StoryBody";
import { StoryCategoryNav } from "@/components/story/StoryCategoryNav";
import { StoryFooterDisclaimer } from "@/components/story/StoryFooterDisclaimer";
import { StoryHeroImage } from "@/components/story/StoryHeroImage";
import { StoryHighlights } from "@/components/story/StoryHighlights";
import { StoryMobileShareBar } from "@/components/story/StoryMobileShareBar";
import { StoryReaderShell } from "@/components/story/StoryReaderShell";
import { AdSlot } from "@/components/monetization/AdSlot";
import { SponsoredStoryBanner } from "@/components/monetization/SponsoredStoryBanner";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import { StoryRelatedGrid } from "@/components/story/StoryRelatedGrid";
import { StoryShareRail } from "@/components/story/StoryShareRail";
import { StorySummaryBox } from "@/components/story/StorySummaryBox";
import { StoryLiveCoverageBanner } from "@/components/story/StoryLiveCoverageBanner";
import { StoryTimeline } from "@/components/story/StoryTimeline";
import { isArticleLive } from "@/lib/news/home-ranking";
import { buildEditorialHeroDisplay } from "@/lib/news/images/editorial-hero-display";
import { resolveStorySlug } from "@/lib/news/related-stories";
import {
  bodySections,
  buildTimelineFromSections,
  parseStoryMarkdown,
} from "@/lib/news/story-markdown";
import {
  buildStoryAttribution,
  buildStoryCategoryNav,
} from "@/lib/news/story-view";
import { estimateReadTime, storyBodyParagraphs } from "@/lib/news/story-utils";
import { formatRelativeTime } from "@/lib/i18n/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { buildStoryBreadcrumbs, getStoryInternalLinks } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo/constants";
import type { EditorialMetadata } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type ImmersiveStoryPageProps = {
  article: NewsArticleRow;
  related: NewsArticleRow[];
  editorialMeta?: EditorialMetadata | null;
  readingTime?: string | null;
  liveCoverage?: {
    slug: string;
    headline?: string | null;
    sourceCount?: number;
  } | null;
  displayLanguage?: NewsroomLanguage;
  translationActive?: boolean;
  sponsoredStory?: SponsoredStoryMeta | null;
};

export function ImmersiveStoryPage({
  article,
  related,
  editorialMeta,
  readingTime: readingTimeOverride,
  liveCoverage,
  displayLanguage = "hi",
  translationActive = false,
  sponsoredStory = null,
}: ImmersiveStoryPageProps) {
  const slug = resolveStorySlug(article);
  const canonicalUrl = `${SITE_URL}/story/${slug}`;
  const category = article.category as NewsCategory;
  const headline = article.ai_headline?.trim() || article.title;

  const heroDisplay = buildEditorialHeroDisplay({
    heroUrl: article.image_url,
    category: article.category,
    region: article.region,
    source: article.source,
    imageMeta: editorialMeta?.image,
  });

  const isLive = isArticleLive(article.published_at);
  const bodyRaw = article.content ?? "";
  const parsed = parseStoryMarkdown(bodyRaw);
  const plainParagraphs =
    parsed.plainParagraphs.length > 0
      ? parsed.plainParagraphs
      : storyBodyParagraphs(article);
  const contentSections = bodySections(parsed.sections);
  const timeline = buildTimelineFromSections(parsed.sections);

  const readTime =
    readingTimeOverride?.trim() ||
    estimateReadTime(`${headline} ${bodyRaw || article.description || ""}`);

  const aiSummary =
    article.ai_summary?.trim() ||
    article.description?.trim() ||
    null;

  const highlights =
    parsed.highlights.length > 0
      ? parsed.highlights
      : plainParagraphs.slice(0, 4);

  const attribution = buildStoryAttribution(article, editorialMeta);
  const categoryNav = buildStoryCategoryNav(category, article.region);
  const aiConfidence = editorialMeta?.ai_confidence ?? null;
  const breadcrumbs = buildStoryBreadcrumbs({
    category,
    headline,
    slug,
    categoryLabel: attribution.categoryLabel,
  });
  const internalLinks = getStoryInternalLinks({ article, related });

  const publishedAtLabel = article.published_at
    ? formatRelativeTime(article.published_at, displayLanguage)
    : null;

  return (
    <>
      <LiveStoryJsonLd
        article={article}
        imageMeta={editorialMeta?.image}
      />
      <ReaderAnalyticsTracker
        slug={slug}
        category={article.category}
        region={article.region}
        surface="story"
      />

      <article
        className="immersive-story immersive-story--premium multilingual-article"
        data-reading="article"
        data-translation={translationActive ? "1" : "0"}
        lang={displayLanguage}
      >
        <div className="immersive-story__layout">
          <div className="immersive-story__main">
            <div className="immersive-story__shell">
              <StoryReaderShell
                slug={slug}
                title={headline}
                url={canonicalUrl}
                readTime={readTime}
              />

              <StoryCategoryNav links={categoryNav} />
              <StoryBreadcrumbs items={breadcrumbs} />

              {sponsoredStory ? (
                <SponsoredStoryBanner meta={sponsoredStory} />
              ) : null}

              <header className="immersive-story__header">
                <p className="immersive-story__kicker story-kicker">
                  {attribution.categoryLabel} · {attribution.regionLabel}
                </p>
                <h1 className="immersive-story__headline story-headline">
                  {headline}
                </h1>
                <StoryAttribution
                  attribution={attribution}
                  readTime={readTime}
                  publishedAtIso={article.published_at}
                  publishedAtLabel={publishedAtLabel}
                  isLive={isLive}
                />
              </header>
            </div>

            <StoryHeroImage
              src={heroDisplay.src}
              fallbackSrc={heroDisplay.fallbackSrc}
              sizes={heroDisplay.sizes}
              alt={headline}
            />

            {liveCoverage ? (
              <div className="immersive-story__shell">
                <StoryLiveCoverageBanner
                  coverageSlug={liveCoverage.slug}
                  coverageHeadline={liveCoverage.headline}
                  sourceCount={liveCoverage.sourceCount}
                />
              </div>
            ) : null}

            <div className="immersive-story__shell immersive-story__content">
              {aiSummary ? (
                <StorySummaryBox
                  summary={aiSummary}
                  confidence={aiConfidence}
                />
              ) : null}

              <StoryHighlights items={highlights} />

              <StoryBody
                sections={contentSections}
                plainParagraphs={plainParagraphs}
                plainBlocks={parsed.plainBlocks}
              />

              <AdSlot
                slotId="story_in_article"
                articleSlug={slug}
                className="immersive-story__shell"
              />

              <StoryTimeline events={timeline} />

              <StoryRelatedGrid articles={related} />

              <InternalSeoLinks
                title="Continue reading"
                links={internalLinks}
              />

              <AdSlot
                slotId="story_footer"
                articleSlug={slug}
              />

              <StoryFooterDisclaimer />
            </div>
          </div>

          <aside
            className="immersive-story__aside"
            aria-label="Share and tools"
          >
            <StoryShareRail url={canonicalUrl} title={headline} />
            <AdSlot slotId="story_sidebar" articleSlug={slug} />
            <AdSlot slotId="affiliate_rail" />
          </aside>
        </div>

        <StoryMobileShareBar url={canonicalUrl} title={headline} />
      </article>
    </>
  );
}
