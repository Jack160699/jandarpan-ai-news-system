import { notFound } from "next/navigation";
import { ContinueRibbon } from "@/components/editorial";
import { PageShell } from "@/components/layout/PageShell";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { ArticleView } from "@/sections/ArticleView";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { getAllArticleSlugs, getArticle } from "@/lib/articles";
import { SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Story not found" };

  const url = `${SITE_URL}/story/${slug}`;

  return {
    title: article.title,
    description: article.deck,
    alternates: { canonical: `/story/${slug}` },
    openGraph: {
      title: article.title,
      description: article.deck,
      type: "article",
      url,
      images: [{ url: article.image, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.deck,
      images: [article.image],
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <PageShell variant="news">
      <ArticleJsonLd article={article} />
      <ConceptBanner />
      <ContinueRibbon />
      <main
        data-narrative-root
        className="home-news-flow mobile-comfort thumb-zone relative z-[2]"
      >
        <ArticleView article={article} />
      </main>
    </PageShell>
  );
}
