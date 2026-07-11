import { notFound, permanentRedirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ArticleView } from "@/sections/ArticleView";
import { ImmersiveStoryPage } from "@/sections/story/ImmersiveStoryPage";
import { getAllArticleSlugs, getArticle } from "@/lib/articles";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import {
  applyLocalizedFieldsToNewsArticle,
  resolveStoryArticleFields,
} from "@/lib/i18n/resolve-article";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { buildLocalizedStoryMetadata } from "@/lib/i18n/multilingual/seo";
import { isNewsroomLanguage } from "@/lib/i18n/languages";
import {
  getStoryArticleBySlug,
  getStoryRelatedArticles,
  getStoryStaticSlugs,
} from "@/lib/story/get-story-data";
import { getEventViewModel } from "@/lib/events/event-view-model";
import { parseStoryMarkdown } from "@/lib/news/story-markdown";
import { storyBodyParagraphs } from "@/lib/news/story-utils";
import { buildStoryIntelligence } from "@/lib/story/story-intelligence";
import { fetchSponsoredStory } from "@/lib/monetization/fetch-payload";
import {
  articleJsonLd,
  buildPageMetadata,
  shouldRedirectToCanonicalSlug,
} from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateStaticParams() {
  try {
    const generated = await getStoryStaticSlugs(200);
    if (generated.length) {
      return generated.map((slug) => ({ slug }));
    }
  } catch {
    /* fallback */
  }
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const displayLang = isNewsroomLanguage(langParam) ? langParam : undefined;

  const generated = await getStoryArticleBySlug(slug);
  if (generated) {
    const article = generatedToNewsArticle(generated);
    const ogImage =
      generated.editorial_metadata?.image?.og_url ?? article.image_url;
    return buildLocalizedStoryMetadata(generated, {
      displayLanguage: displayLang,
      ogImage: ogImage ?? undefined,
    });
  }

  const editorial = getArticle(slug);
  if (!editorial) return { title: "Story not found" };

  return buildPageMetadata({
    title: editorial.title,
    description: editorial.deck,
    path: `/story/${slug}`,
    ogImage: editorial.image,
    ogType: "article",
    noindex: true,
  });
}

export default async function StoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const readerLang = isNewsroomLanguage(langParam)
    ? langParam
    : await getServerReaderLanguage();

  const generatedRow = await getStoryArticleBySlug(slug);

  if (generatedRow) {
    if (
      generatedRow.slug &&
      shouldRedirectToCanonicalSlug(slug, generatedRow.slug)
    ) {
      permanentRedirect(`/story/${generatedRow.slug}`);
    }

    const [localized, relatedResult, eventViewModel] = await Promise.all([
      resolveStoryArticleFields(generatedRow, readerLang),
      getStoryRelatedArticles(generatedRow.slug ?? slug, readerLang),
      generatedRow.event_id
        ? getEventViewModel(generatedRow.event_id)
        : Promise.resolve(null),
    ]);
    if (!localized?.headline?.trim()) notFound();

    const liveArticle = applyLocalizedFieldsToNewsArticle(
      generatedToNewsArticle(generatedRow),
      localized
    );

    const parsed = parseStoryMarkdown(liveArticle.content ?? "");
    const plainParagraphs =
      parsed.plainParagraphs.length > 0
        ? parsed.plainParagraphs
        : storyBodyParagraphs(liveArticle);

    const intelligence = buildStoryIntelligence({
      article: liveArticle,
      parsed: { ...parsed, plainParagraphs },
      editorialMeta: generatedRow.editorial_metadata,
      generatedRow,
      eventViewModel,
      tags: generatedRow.tags ?? [],
      readingTime: localized.readingTime,
      displayLanguage: readerLang,
      translationActive:
        localized.usedTranslation && !localized.usedSourceFallback,
    });

    const tenant = await getTenantConfig();
    const sponsoredStory =
      tenant.monetization?.sponsoredStoriesEnabled !== false
        ? await fetchSponsoredStory(tenant.id, generatedRow.slug)
        : null;

    return (
      <PageShell variant="news">
        <main id="main-content" className="relative z-[2]" role="main">
          <ImmersiveStoryPage
            article={liveArticle}
            sponsoredStory={sponsoredStory}
            related={relatedResult.articles}
            relatedDiscoverySubtitle={relatedResult.discoverySubtitle}
            intelligence={intelligence}
            editorialMeta={generatedRow.editorial_metadata}
            generatedRow={generatedRow}
          />
        </main>
      </PageShell>
    );
  }

  const editorial = getArticle(slug);
  if (!editorial) notFound();

  return (
    <PageShell variant="news">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd(editorial)),
        }}
      />
      <main
        data-narrative-root
        className="home-news-flow mobile-comfort thumb-zone relative z-[2]"
      >
        <ArticleView article={editorial} />
      </main>
    </PageShell>
  );
}
