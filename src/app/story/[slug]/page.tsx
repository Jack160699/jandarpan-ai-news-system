import { notFound } from "next/navigation";
import { ContinueRibbon } from "@/components/editorial";
import { AtmosphereController } from "@/components/cinema";
import { PageShell } from "@/components/layout/PageShell";
import { ArticleView } from "@/sections/ArticleView";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { getAllArticleSlugs, getArticle } from "@/lib/articles";
import { BRAND } from "@/lib/brand";

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
  return {
    title: `${article.title} · ${BRAND.nameEn}`,
    description: article.deck,
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <PageShell>
      <LanguageGate />
      <ConceptBanner />
      <AtmosphereController />
      <ContinueRibbon />
      <main data-narrative-root className="mobile-comfort relative z-[2] thumb-zone pb-24">
        <ArticleView article={article} />
      </main>
    </PageShell>
  );
}
