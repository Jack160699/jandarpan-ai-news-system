import { ArticleMemoryTracker } from "@/components/editorial/ArticleMemoryTracker";
import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import { SponsoredStoryContent } from "@/components/monetization/SponsoredStoryContent";
import { isArticleLive } from "@/lib/news/home-ranking";
import { buildEditorialHeroDisplay } from "@/lib/news/images/editorial-hero-display";
import type { NewsCategory } from "@/lib/types/news-article";
import { AtlasStoryReadingChrome } from "./components/AtlasStoryReadingChrome";
import { AtlasStoryHero } from "./components/AtlasStoryHero";
import { AtlasStoryIntro } from "./components/AtlasStoryIntro";
import { AtlasStoryFactSections } from "./components/AtlasStoryFactSections";
import { AtlasStoryBody } from "./components/AtlasStoryBody";
import { AtlasStoryThread } from "./components/AtlasStoryThread";
import { AtlasStoryShareBar } from "./components/AtlasStoryShareBar";
import { AtlasStoryNext } from "./components/AtlasStoryNext";
import type { AtlasStoryExperienceProps } from "./types";
import "./styles/story-atlas.css";

export function AtlasStoryExperience({
  article,
  related,
  intelligence,
  editorialMeta,
  sponsoredStory = null,
  contentSections,
  plainParagraphs,
  plainBlocks,
  canonicalUrl,
  slug,
  headline,
  shareSummary,
  translationActive = false,
}: AtlasStoryExperienceProps) {
  const {
    editorial,
    event: eventViewModel,
    reader,
    timeline,
    attribution,
    flags,
  } = intelligence;

  const displayLanguage = reader.displayLanguage;
  const category = article.category as NewsCategory;
  const pageTranslationActive =
    translationActive || reader.translationActive;

  const heroDisplay = buildEditorialHeroDisplay({
    heroUrl: article.image_url,
    category: article.category,
    region: article.region,
    source: article.source,
    imageMeta: editorialMeta?.image,
  });

  const isLive = isArticleLive(article.published_at);
  const nextArticle = related[0] ?? null;
  const deskLabel =
    displayLanguage === "hi" ? attribution.desk.nameHi : attribution.desk.name;

  const storyContent = (
    <div className="atlas-story">
      <div className="atlas-story__inner">
        <AtlasStoryHero
          src={heroDisplay.src}
          fallbackSrc={heroDisplay.fallbackSrc}
          alt={headline}
          category={category}
          sizes={heroDisplay.sizes}
        />

        <AtlasStoryIntro
          headline={headline}
          summary={shareSummary}
          categoryLabel={attribution.categoryLabel}
          author={attribution.author}
          desk={deskLabel}
          publishedAtLabel={reader.publishedAtLabel}
          updatedAtLabel={reader.updatedAtLabel}
          readTime={reader.readTime}
          intelligence={intelligence}
          language={displayLanguage}
          isLive={isLive}
        />

        <AtlasStoryFactSections editorial={editorial} />

        <AtlasStoryBody
          sections={contentSections}
          plainParagraphs={plainParagraphs}
          plainBlocks={plainBlocks}
        />

        <AtlasStoryThread
          language={displayLanguage}
          eventViewModel={eventViewModel}
          timelineEvents={
            timeline.events.length > 0 ? timeline.events : undefined
          }
          liveHref={flags.liveHref || null}
        />

        <AtlasStoryShareBar
          title={headline}
          url={canonicalUrl}
          language={displayLanguage}
        />

        <AtlasStoryNext article={nextArticle} language={displayLanguage} />
      </div>
    </div>
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

      <article
        className="atlas-story-page multilingual-article route-story-page"
        data-translation={pageTranslationActive ? "1" : "0"}
        lang={displayLanguage}
      >
        <AtlasStoryReadingChrome slug={slug} title={headline} url={canonicalUrl}>
          {sponsoredStory ? (
            <SponsoredStoryContent meta={sponsoredStory}>
              {storyContent}
            </SponsoredStoryContent>
          ) : (
            storyContent
          )}
        </AtlasStoryReadingChrome>
      </article>
    </>
  );
}
