import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getArticleById } from "@/lib/news-db";
import { resolveStorySlug } from "@/lib/news/related-stories";
import { NOINDEX_ROBOTS } from "@/lib/seo";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Redirect",
  robots: NOINDEX_ROBOTS,
};

/** Legacy route — redirect to SEO story URL */
export default async function LegacyArticleRedirect({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) notFound();

  redirect(`/story/${resolveStorySlug(article)}`);
}
