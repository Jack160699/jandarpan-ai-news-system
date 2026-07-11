import { ArticleMemoryTracker } from "@/components/editorial/ArticleMemoryTracker";
import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { StoryBreadcrumbs } from "@/components/seo/StoryBreadcrumbs";
import { StoryEditorialIntelligence } from "@/components/story/StoryEditorialIntelligence";
import { StoryBody } from "@/components/story/StoryBody";
import { StoryCategoryNav } from "@/components/story/StoryCategoryNav";
import { StoryCinematicHero } from "@/components/story/StoryCinematicHero";
import { StoryContinueReading } from "@/components/story/StoryContinueReading";
import { StoryFloatingCTA } from "@/components/story/StoryFloatingCTA";
import { StoryFooterDisclaimer } from "@/components/story/StoryFooterDisclaimer";
import { StoryMobileShareBar } from "@/components/story/StoryMobileShareBar";
import { ArticleCardActions } from "@/components/article/ArticleCardActions";
import { StoryReaderShell } from "@/components/story/StoryReaderShell";
import { AdSlot } from "@/components/monetization/AdSlot";
import { SponsoredStoryBanner } from "@/components/monetization/SponsoredStoryBanner";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import { StoryRelatedGrid } from "@/components/story/StoryRelatedGrid";
import { StoryEditorialTrust } from "@/components/story/StoryEditorialTrust";
import { StoryEventNavigator } from "@/components/story/StoryEventNavigator";
import { StoryKnowledgeContext } from "@/components/story/StoryKnowledgeContext";
import { StoryShareRail } from "@/components/story/StoryShareRail";
import { StoryTimeline } from "@/components/story/StoryTimeline";
import { StoryTopicChips } from "@/components/story/StoryTopicChips";
import { isArticleLive } from "@/lib/news/home-ranking";
import { buildEditorialHeroDisplay } from "@/lib/news/images/editorial-hero-display";
import { StoryReadHelpers } from "@/components/story/StoryReadHelpers";
import { partitionRelatedStories } from "@/lib/news/partition-related-stories";
import { resolveStorySlug } from "@/lib/news/related-stories";
import {
  bodySections,
  parseStoryMarkdown,
} from "@/lib/news/story-markdown";
import { buildStoryCategoryNav } from "@/lib/news/story-view";
import { storyBodyParagraphs } from "@/lib/news/story-utils";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { buildStoryBreadcrumbs, getStoryInternalLinks } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo/constants";
import type { EventViewModel } from "@/lib/events/event-view-model";
import {
  buildStoryIntelligence,
  type StoryIntelligenceVm,
} from "@/lib/story/story-intelligence";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type ImmersiveStoryPageProps = {
  article: NewsArticleRow;
  related: NewsArticleRow[];
  relatedDiscoverySubtitle?: string | null;
  intelligence?: StoryIntelligenceVm;
  editorialMeta?: EditorialMetadata | null;
  readingTime?: string | null;
  eventViewModel?: EventViewModel | null;
  displayLanguage?: NewsroomLanguage;
  translationActive?: boolean;
  sponsoredStory?: SponsoredStoryMeta | null;
  tags?: string[];
  generatedRow?: GeneratedArticleRow | null;
};

function resolveStoryIntelligence(props: ImmersiveStoryPageProps): StoryIntelligenceVm {
  if (props.intelligence) return props.intelligence;

  const displayLanguage = props.displayLanguage ?? "hi";
  const bodyRaw = props.article.content ?? "";
  const parsed = parseStoryMarkdown(bodyRaw);
  const headline = props.article.ai_headline?.trim() || props.article.title;
  const plainParagraphs =
    parsed.plainParagraphs.length > 0
      ? parsed.plainParagraphs
      : storyBodyParagraphs(props.article);

  return buildStoryIntelligence({
    article: props.article,
    parsed: {
      ...parsed,
      plainParagraphs,
    },
    editorialMeta: props.editorialMeta,
    generatedRow: props.generatedRow,
    eventViewModel: props.eventViewModel ?? null,
    tags: props.tags,
    readingTime: props.readingTime,
    displayLanguage,
    translationActive: props.translationActive ?? false,
  });
}

export function ImmersiveStoryPage(props: ImmersiveStoryPageProps) {
  const {
    article,
    related,
    relatedDiscoverySubtitle = null,
    editorialMeta,
    sponsoredStory = null,
    translationActive = false,
  } = props;

  const intelligence = resolveStoryIntelligence(props);
  const {
    editorial,
    trust,
    knowledge,
    event: eventViewModel,
    reader,
    timeline,
    flags,
    attribution,
  } = intelligence;

  const displayLanguage = reader.displayLanguage;
  const pageTranslationActive =
    translationActive || reader.translationActive;
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

  const aiSummary = article.ai_summary?.trim() || null;
  const shareSummary = aiSummary ?? plainParagraphs.slice(0, 2).join(" ");

  const categoryNav = buildStoryCategoryNav(category, article.region);
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
      <ArticleMemoryTracker slug={slug} title={headline} />

      <article
        className="immersive-story immersive-story--premium immersive-story--editorial immersive-story--cinematic multilingual-article route-story-page"
        data-reading="article"
        data-translation={pageTranslationActive ? "1" : "0"}
        lang={displayLanguage}
      >
        <div className="immersive-story__layout">
          <div className="immersive-story__main">
            <div className="immersive-story__shell immersive-story__shell--chrome">
              <StoryReaderShell
                slug={slug}
                title={headline}
                url={canonicalUrl}
                readTime={reader.readTime}
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
              readTime={reader.readTime}
              publishedAtIso={article.published_at}
              publishedAtLabel={reader.publishedAtLabel}
              isLive={isLive}
              desk={attribution.desk}
              imageCredit={heroDisplay.imageMeta?.source ?? null}
            />

            <div className="immersive-story__shell">
              <ArticleCardActions
                articleId={slug}
                headline={headline}
                summary={shareSummary}
                slugOrPath={slug}
                className="article-page__actions"
                enableSpeedCycle
              />
            </div>

            <div className="immersive-story__shell immersive-story__content">
              <StoryTopicChips
                tags={editorial.topicChips}
                region={article.region}
                category={attribution.categoryLabel}
              />

              <StoryEditorialIntelligence
                vm={editorial}
                sourceCount={attribution.sourceCount}
                displayLanguage={displayLanguage}
                omitConfidence={flags.omitEditorialConfidence}
              />

              {trust.hasLayer ? (
                <StoryEditorialTrust
                  vm={trust}
                  displayLanguage={displayLanguage}
                />
              ) : null}

              {knowledge.hasLayer ? (
                <StoryKnowledgeContext vm={knowledge} />
              ) : null}

              {flags.showEventNavigator && eventViewModel ? (
                <StoryEventNavigator
                  vm={eventViewModel}
                  displayLanguage={displayLanguage}
                  timeline={timeline.events}
                  timelineTitle={timeline.title}
                  showEventTimeline={timeline.source === "event"}
                />
              ) : null}

              <StoryBody
                sections={contentSections}
                plainParagraphs={plainParagraphs}
                plainBlocks={parsed.plainBlocks}
              />

              <AdSlot
                slotId="story_in_article"
                articleSlug={slug}
                className="immersive-story__ad"
              />

              {timeline.source !== "event" ? (
                <StoryTimeline events={timeline.events} title={timeline.title} />
              ) : null}

              <StoryRelatedGrid
                articles={gridRelated}
                language={displayLanguage}
                title={t.story.relatedStories}
                subtitle={relatedDiscoverySubtitle ?? t.story.trendingNow}
              />

              <StoryContinueReading
                related={continueRelated}
                hubLinks={internalLinks}
                language={displayLanguage}
                title={t.story.relatedStories}
                subtitle={t.story.trendingNow}
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
          liveHref={flags.liveHref}
          shortsHref="/shorts"
        />
        <StoryMobileShareBar url={canonicalUrl} title={headline} />
        <StoryReadHelpers readTime={reader.readTime} />
      </article>
    </>
  );
}
