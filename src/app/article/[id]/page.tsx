import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { NewsImage } from "@/components/live/NewsImage";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { getArticleById } from "@/lib/news-db";
import { formatPublishedAt } from "@/lib/news-db";
import { categoryLabel } from "@/lib/live-news-display";
import { resolveCardImage } from "@/lib/news/images/display";
import type { NewsCategory } from "@/lib/types/news-article";
import { BRAND } from "@/lib/brand";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return { title: "Article not found" };

  return {
    title: article.title,
    description: article.description ?? undefined,
    openGraph: {
      title: article.title,
      description: article.description ?? undefined,
      images: article.image_url ? [{ url: article.image_url }] : undefined,
    },
  };
}

export default async function LiveArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) notFound();

  const category = article.category as NewsCategory;
  const heroImage = resolveCardImage(
    {
      imageUrl: article.image_url,
      category: article.category,
      source: article.source,
      articleUrl: article.article_url,
    },
    960
  );
  const body =
    article.content?.trim() ||
    article.description?.trim() ||
    "Full article available at the original publisher.";

  return (
    <PageShell variant="news">
      <ConceptBanner />
      <main className="home-news-flow mobile-comfort relative z-[2] pb-24 pt-4">
        <article className="article-page article-flow">
          <div className="editorial-container">
            <div className="article-page__toolbar">
              <Link href="/" className="article-page__back tap-target">
                ← Back to edition
              </Link>
              {article.article_url ? (
                <a
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="meta-label text-[var(--accent-category)] tap-target"
                >
                  Original source ↗
                </a>
              ) : null}
            </div>

            <header className="article-header">
              <p className="feed-card__category capitalize">
                {categoryLabel(category)}
              </p>
              <h1 className="article-header__title">{article.title}</h1>
              {article.description ? (
                <p className="article-header__deck">{article.description}</p>
              ) : null}
            </header>

            <div className="article-meta-bar" role="group">
              {article.author ? (
                <span className="article-meta-bar__author">{article.author}</span>
              ) : null}
              {article.source ? (
                <>
                  <span className="article-meta-bar__dot" aria-hidden>
                    ·
                  </span>
                  <span className="article-meta-bar__muted">{article.source}</span>
                </>
              ) : null}
              <span className="article-meta-bar__dot" aria-hidden>
                ·
              </span>
              <span className="article-meta-bar__muted">
                {formatPublishedAt(article.published_at)}
              </span>
            </div>

            <figure className="article-figure">
              <div className="article-figure__media relative">
                <NewsImage
                  src={heroImage}
                  alt=""
                  priority
                  sizes="(max-width: 768px) 100vw, 48rem"
                  width={960}
                />
              </div>
              {article.source ? (
                <figcaption className="article-figure__caption">
                  {article.source} · {BRAND.nameEn} live wire
                </figcaption>
              ) : null}
            </figure>

            <div className="article-prose">
              {body.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </article>
      </main>
    </PageShell>
  );
}
