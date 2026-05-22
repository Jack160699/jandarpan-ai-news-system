import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ArticleView } from "@/sections/ArticleView";
import { LiveStoryPage } from "@/sections/story/LiveStoryPage";
import { getAllArticleSlugs, getArticle } from "@/lib/articles";
import {
  getArticleBySlug,
  getLiveStorySlugs,
  getRelatedStoriesForArticle,
  fetchArticlePool,
} from "@/lib/news-db";
import { liveStoryMetadata } from "@/lib/news/story-seo";
import { NOINDEX_ROBOTS, SITE_URL, articleJsonLd } from "@/lib/seo";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const editorial = getAllArticleSlugs().map((slug) => ({ slug }));
  try {
    const live = await getLiveStorySlugs(200);
    const liveParams = live.map((slug) => ({ slug }));
    return [...editorial, ...liveParams];
  } catch {
    return editorial;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const live = await getArticleBySlug(slug);
  if (live) return liveStoryMetadata(live);

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

  const liveArticle = await getArticleBySlug(slug);

  if (liveArticle) {
    const [related, topicPool] = await Promise.all([
      getRelatedStoriesForArticle(liveArticle, 6),
      fetchArticlePool(),
    ]);

    return (
      <PageShell variant="news">
        <main
          data-narrative-root
          className="home-news-flow mobile-comfort thumb-zone relative z-[2]"
        >
          <LiveStoryPage
            article={liveArticle}
            related={related}
            topicPool={topicPool}
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
