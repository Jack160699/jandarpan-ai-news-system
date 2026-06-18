import { notFound, permanentRedirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ArticleView } from "@/sections/ArticleView";
import { ImmersiveStoryPage } from "@/sections/story/ImmersiveStoryPage";
import { getAllArticleSlugs, getArticle } from "@/lib/articles";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import {
  applyLocalizedFieldsToNewsArticle,
  resolveLocalizedFieldsStrict,
  resolveStoryArticleFields,
} from "@/lib/i18n/resolve-article";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { buildLocalizedStoryMetadata } from "@/lib/i18n/multilingual/seo";
import { isNewsroomLanguage } from "@/lib/i18n/languages";
import { pickRelatedStories } from "@/lib/news/related-stories";
import {
  fetchGeneratedArticlePool,
  getGeneratedArticleBySlug,
  getGeneratedArticleSlugs,
} from "@/lib/newsroom/generated/read";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
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
    const generated = await getGeneratedArticleSlugs(200);
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

  const generated = await getGeneratedArticleBySlug(slug);
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

  const generatedRow = await getGeneratedArticleBySlug(slug);

  if (generatedRow) {
    if (
      generatedRow.slug &&
      shouldRedirectToCanonicalSlug(slug, generatedRow.slug)
    ) {
      permanentRedirect(`/story/${generatedRow.slug}`);
    }

    const poolRows = filterPoolByLanguage(
      await fetchGeneratedArticlePool(80),
      readerLang
    );
    const localized = await resolveStoryArticleFields(generatedRow, readerLang);
    if (!localized?.headline?.trim()) notFound();

    const liveArticle = applyLocalizedFieldsToNewsArticle(
      generatedToNewsArticle(generatedRow),
      localized
    );
    const poolArticles = poolRows
      .map((r) => {
        const fields = resolveLocalizedFieldsStrict(r, readerLang);
        if (!fields?.headline?.trim()) return null;
        return applyLocalizedFieldsToNewsArticle(
          generatedToNewsArticle(r),
          fields
        );
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
    const related = pickRelatedStories(liveArticle, poolArticles, 8);

    let liveCoverage: {
      slug: string;
      headline?: string | null;
      sourceCount?: number;
    } | null = null;

    if (generatedRow.event_id && isSupabaseConfigured()) {
      const supabase = createAdminServerClient();
      const { data: ev } = await supabase
        .from("news_events")
        .select(
          "coverage_slug,coverage_headline,is_live,source_count"
        )
        .eq("id", generatedRow.event_id)
        .maybeSingle();
      if (ev?.is_live && ev.coverage_slug) {
        liveCoverage = {
          slug: ev.coverage_slug,
          headline: ev.coverage_headline,
          sourceCount: ev.source_count ?? undefined,
        };
      }
    }

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
            related={related}
            editorialMeta={generatedRow.editorial_metadata}
            readingTime={localized.readingTime}
            liveCoverage={liveCoverage}
            displayLanguage={readerLang}
            translationActive={
              localized.usedTranslation && !localized.usedSourceFallback
            }
            tags={generatedRow.tags ?? []}
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
