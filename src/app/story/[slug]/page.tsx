import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ArticleView } from "@/sections/ArticleView";
import { ImmersiveStoryPage } from "@/sections/story/ImmersiveStoryPage";
import { getAllArticleSlugs, getArticle } from "@/lib/articles";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import { pickRelatedStories } from "@/lib/news/related-stories";
import {
  fetchGeneratedArticlePool,
  getGeneratedArticleBySlug,
  getGeneratedArticleSlugs,
} from "@/lib/newsroom/generated/read";
import { liveStoryMetadata } from "@/lib/news/story-seo";
import { NOINDEX_ROBOTS, SITE_URL, articleJsonLd } from "@/lib/seo";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const generated = await getGeneratedArticleBySlug(slug);
  if (generated) {
    return liveStoryMetadata(generatedToNewsArticle(generated));
  }

  const editorial = getArticle(slug);
  if (!editorial) return { title: "Story not found" };

  const url = `${SITE_URL}/story/${slug}`;
  return {
    title: editorial.title,
    description: editorial.deck,
    alternates: { canonical: `/story/${slug}` },
    robots: NOINDEX_ROBOTS,
    openGraph: {
      title: editorial.title,
      description: editorial.deck,
      type: "article",
      url,
      images: [{ url: editorial.image }],
    },
    twitter: {
      card: "summary_large_image",
      title: editorial.title,
      description: editorial.deck,
      images: [editorial.image],
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;

  const generatedRow = await getGeneratedArticleBySlug(slug);

  if (generatedRow) {
    const liveArticle = generatedToNewsArticle(generatedRow);
    const poolRows = await fetchGeneratedArticlePool(80);
    const topicPool = poolRows.map(generatedToNewsArticle);
    const related = pickRelatedStories(liveArticle, topicPool, 4);

    return (
      <PageShell variant="news">
        <main id="main-content" className="relative z-[2]" role="main">
          <ImmersiveStoryPage article={liveArticle} related={related} />
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
