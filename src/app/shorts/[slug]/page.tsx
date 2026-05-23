import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { NewsShortCard } from "@/components/shorts/NewsShortCard";
import {
  buildNewsShortForArticle,
  bundleFromRow,
  shortCardFromRow,
} from "@/lib/news/shorts/build-short";
import { getGeneratedArticleBySlug } from "@/lib/newsroom/generated/read";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getGeneratedArticleBySlug(slug);
  if (!row) return { title: "Short not found" };
  const bundle = bundleFromRow(row);
  return {
    title: `${row.headline} · 60s Short`,
    description: bundle?.summary60s ?? row.summary ?? undefined,
  };
}

export default async function ShortReelPage({ params }: PageProps) {
  const { slug } = await params;
  const row = await getGeneratedArticleBySlug(slug);
  if (!row) notFound();

  let card = shortCardFromRow(row);
  if (!card) {
    const bundle = await buildNewsShortForArticle(row);
    row.shorts_metadata = bundle;
    card = shortCardFromRow(row);
  }
  if (!card) notFound();

  return (
    <div className="shorts-page">
      <header className="shorts-page__header">
        <Link href="/shorts" className="shorts-page__back">
          ← All shorts
        </Link>
        <span className="text-sm font-medium truncate max-w-[50%]">
          {row.headline.slice(0, 40)}
        </span>
      </header>
      <div className="shorts-feed__item" style={{ minHeight: "auto", padding: "1rem" }}>
        <NewsShortCard short={card} active autoplay />
      </div>
    </div>
  );
}
