import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { StoryBreadcrumbs } from "@/components/seo/StoryBreadcrumbs";
import { StoryBody } from "@/components/story/StoryBody";
import { StoryCategoryNav } from "@/components/story/StoryCategoryNav";
import { StoryCinematicHero } from "@/components/story/StoryCinematicHero";
import { StoryContinueReading } from "@/components/story/StoryContinueReading";
import { StoryFloatingCTA } from "@/components/story/StoryFloatingCTA";
import { StoryFooterDisclaimer } from "@/components/story/StoryFooterDisclaimer";
import { StoryHighlights } from "@/components/story/StoryHighlights";
import { StoryInlineBreaking } from "@/components/story/StoryInlineBreaking";
import { StoryInlineRelated } from "@/components/story/StoryInlineRelated";
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
import { StoryAiTransparency } from "@/components/story/StoryAiTransparency";
import { StoryTimeline } from "@/components/story/StoryTimeline";
import { StoryTopicChips } from "@/components/story/StoryTopicChips";
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
  tags?: string[];
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
  tags = [],
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

  const inlineRelated = related.slice(0, 3);
  const gridRelated = related.slice(0, 8);
  const continueRelated = related.slice(0, 6);

  const liveHref = liveCoverage
    ? `/live/${liveCoverage.slug}`
    : "/#breaking";

  const inlineSlot = (
    <>
      {liveCoverage ? (
        <StoryInlineBreaking
          headline={
            liveCoverage.headline ??
            "Live coverage is updating for this story."
          }
          href={liveHref}
          sourceCount={liveCoverage.sourceCount}
        />
      ) : null}
      <StoryInlineRelated articles={inlineRelated} />
    </>
  );

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
        className="immersive-story immersive-story--premium immersive-story--editorial immersive-story--cinematic multilingual-article"
        data-reading="article"
        data-translation={translationActive ? "1" : "0"}
        lang={displayLanguage}
      >
        <div className="immersive-story__layout">
          <div className="immersive-story__main">
            <div className="immersive-story__shell immersive-story__shell--chrome">
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
            </div>

            <StoryCinematicHero
              src={heroDisplay.src}
              fallbackSrc={heroDisplay.fallbackSrc}
              sizes={heroDisplay.sizes}
              headline={headline}
              categoryLabel={attribution.categoryLabel}
              regionLabel={attribution.regionLabel}
              attribution={attribution}
              readTime={readTime}
              publishedAtIso={article.published_at}
              publishedAtLabel={publishedAtLabel}
              isLive={isLive}
              desk={attribution.desk}
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
              <StoryTopicChips
                tags={tags}
                region={article.region}
                category={attribution.categoryLabel}
              />

              {aiSummary ? (
                <StorySummaryBox summary={aiSummary} />
              ) : null}

              <StoryAiTransparency sourceCount={attribution.sourceCount} />

              <StoryHighlights items={highlights} />

              <StoryBody
                sections={contentSections}
                plainParagraphs={plainParagraphs}
                plainBlocks={parsed.plainBlocks}
                inlineSlot={inlineSlot}
                inlineAfterParagraph={3}
              />

              <AdSlot
                slotId="story_in_article"
                articleSlug={slug}
                className="immersive-story__ad"
              />

              <StoryTimeline events={timeline} />

              <StoryRelatedGrid articles={gridRelated} />

              <StoryContinueReading
                related={continueRelated}
                hubLinks={internalLinks}
              />

              <AdSlot slotId="story_footer" articleSlug={slug} />

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

        <StoryFloatingCTA
          shareUrl={canonicalUrl}
          shareTitle={headline}
          liveHref={liveHref}
          shortsHref="/shorts"
        />
        <StoryMobileShareBar url={canonicalUrl} title={headline} />
      </article>
    </>
  );
}
