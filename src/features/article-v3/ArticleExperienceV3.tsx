import { ArticleMemoryTracker } from "@/components/editorial/ArticleMemoryTracker";
import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { StoryBreadcrumbs } from "@/components/seo/StoryBreadcrumbs";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import { SponsoredStoryContent } from "@/components/monetization/SponsoredStoryContent";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { PageContainer } from "@/layouts";
import { isArticleLive } from "@/lib/news/home-ranking";
import { buildEditorialHeroDisplay } from "@/lib/news/images/editorial-hero-display";
import { partitionRelatedStories } from "@/lib/news/partition-related-stories";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildStoryBreadcrumbs, getStoryInternalLinks } from "@/lib/seo";
import type { NewsCategory } from "@/lib/types/news-article";
import {
  ArticleHero,
  ArticleBody,
  ArticleFooter,
  AISummaryCard,
  KeyFacts,
  Timeline,
  SourcesCard,
  ContinueReading,
  RelatedStories,
  DistrictContext,
  ReadingToolbar,
  FloatingShare,
  ShareRail,
} from "./components";
import type { ArticleExperienceV3Props } from "./types";
import "./styles/article-v3.css";

/**
 * JDP-004 — Article Experience V3
 *
 * Complete article reading redesign using JDP-001 design system
 * and JDP-002 layout primitives. Consumes existing story data layer.
 */
export function ArticleExperienceV3({
  article,
  related,
  relatedDiscoverySubtitle = null,
  intelligence,
  editorialMeta,
  generatedRow,
  sponsoredStory = null,
  contentSections,
  plainParagraphs,
  plainBlocks,
  canonicalUrl,
  slug,
  headline,
  shareSummary,
  translationActive = false,
}: ArticleExperienceV3Props) {
  const {
    editorial,
    trust,
    knowledge,
    reader,
    timeline,
    attribution,
  } = intelligence;

  const displayLanguage = reader.displayLanguage;
  const category = article.category as NewsCategory;

  const heroDisplay = buildEditorialHeroDisplay({
    heroUrl: article.image_url,
    category: article.category,
    region: article.region,
    source: article.source,
    imageMeta: editorialMeta?.image,
  });

  const isLive = isArticleLive(article.published_at);
  const aiSummary = article.ai_summary?.trim() || editorial.aiSummary;

  const breadcrumbs = buildStoryBreadcrumbs({
    category,
    headline,
    slug,
    categoryLabel: attribution.categoryLabel,
  });
  const internalLinks = getStoryInternalLinks({ article, related });

  const { grid: gridRelated, continue: continueRelated } =
    partitionRelatedStories(related, 6, 4);

  const t = getDictionary(displayLanguage);
  const takeaways = editorial.takeaways.length
    ? editorial.takeaways
    : editorial.whyThisMatters
      ? [editorial.whyThisMatters]
      : [];

  const articleMainContent = (
    <>
      <HomeSectionErrorBoundary name="article-v3-hero">
        <ArticleHero
          headline={headline}
          categoryLabel={attribution.categoryLabel}
          regionLabel={attribution.regionLabel}
          readTime={reader.readTime}
          publishedAtLabel={reader.publishedAtLabel}
          isLive={isLive}
          desk={attribution.desk?.name ?? null}
          imageSrc={heroDisplay.src}
          imageFallbackSrc={heroDisplay.fallbackSrc}
          imageSizes={heroDisplay.sizes}
          imageCredit={heroDisplay.imageMeta?.source ?? null}
        />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="article-v3-summary">
        <AISummaryCard summary={aiSummary} />
      </HomeSectionErrorBoundary>

      {takeaways.length > 0 ? (
        <HomeSectionErrorBoundary name="article-v3-facts">
          <KeyFacts facts={takeaways} />
        </HomeSectionErrorBoundary>
      ) : null}

      <HomeSectionErrorBoundary name="article-v3-body">
        <ArticleBody
          sections={contentSections}
          plainParagraphs={plainParagraphs}
          plainBlocks={plainBlocks}
        />
      </HomeSectionErrorBoundary>

      {timeline.events.length > 0 && timeline.source !== "event" ? (
        <HomeSectionErrorBoundary name="article-v3-timeline">
          <Timeline events={timeline.events} title={timeline.title} />
        </HomeSectionErrorBoundary>
      ) : null}

      {(editorial.sources.length > 0 || trust.sourceSummaryLines.length > 0) ? (
        <HomeSectionErrorBoundary name="article-v3-sources">
          <SourcesCard
            sources={editorial.sources}
            sourceSummaryLines={trust.sourceSummaryLines}
          />
        </HomeSectionErrorBoundary>
      ) : null}

      {knowledge.hasLayer ? (
        <HomeSectionErrorBoundary name="article-v3-district">
          <DistrictContext
            district={knowledge.district}
            districtSlug={knowledge.districtSlug}
            topics={knowledge.topics}
          />
        </HomeSectionErrorBoundary>
      ) : null}

      {gridRelated.length > 0 ? (
        <HomeSectionErrorBoundary name="article-v3-related">
          <RelatedStories
            articles={gridRelated}
            language={displayLanguage}
            title={t.story.relatedStories}
            subtitle={relatedDiscoverySubtitle ?? t.story.trendingNow}
          />
        </HomeSectionErrorBoundary>
      ) : null}

      <HomeSectionErrorBoundary name="article-v3-continue">
        <ContinueReading
          related={continueRelated}
          hubLinks={internalLinks}
          language={displayLanguage}
          title={t.story.relatedStories}
          subtitle={t.story.trendingNow}
        />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="article-v3-footer">
        <ArticleFooter
          publishedAtLabel={reader.publishedAtLabel}
          updatedAtLabel={reader.updatedAtLabel}
          readTime={reader.readTime}
          sourceCount={attribution.sourceCount}
          aiDisclosureLines={trust.aiDisclosureLines}
        />
      </HomeSectionErrorBoundary>
    </>
  );

  return (
    <>
      <LiveStoryJsonLd article={article} imageMeta={editorialMeta?.image} />
      <ReaderAnalyticsTracker
        slug={slug}
        category={article.category}
        region={article.region}
        surface="story"
      />
      <ArticleMemoryTracker slug={slug} title={headline} />

      <PageContainer width="article" className="article-v3" as="div">
        <article
          data-reading="article-v3"
          data-translation={translationActive ? "1" : "0"}
          lang={displayLanguage}
          className="article-v3__layout"
        >
          <div className="article-v3__main">
            <HomeSectionErrorBoundary name="article-v3-toolbar">
              <ReadingToolbar
                slug={slug}
                title={headline}
                url={canonicalUrl}
                readTime={reader.readTime}
                summary={shareSummary}
              />
            </HomeSectionErrorBoundary>

            <StoryBreadcrumbs items={breadcrumbs} />

            {sponsoredStory ? (
              <SponsoredStoryContent meta={sponsoredStory}>
                {articleMainContent}
              </SponsoredStoryContent>
            ) : (
              articleMainContent
            )}
          </div>

          <aside className="article-v3__aside" aria-label="Share and tools">
            <ShareRail url={canonicalUrl} title={headline} />
          </aside>
        </article>
      </PageContainer>

      <FloatingShare
        url={canonicalUrl}
        title={headline}
      />
    </>
  );
}
