import Link from "next/link";
import { ClusterConfidenceBadge } from "@/components/coverage/ClusterConfidenceBadge";
import { CoverageTimeline } from "@/components/coverage/CoverageTimeline";
import { LiveUpdateFeed } from "@/components/coverage/LiveUpdateFeed";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { StoryBreadcrumbs } from "@/components/seo/StoryBreadcrumbs";
import { StoryHeroImage } from "@/components/story/StoryHeroImage";
import { StorySummaryBox } from "@/components/story/StorySummaryBox";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import { buildEditorialHeroDisplay } from "@/lib/news/images/editorial-hero-display";
import type { EvolvingCoverageBundle } from "@/lib/news/coverage/read";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { SITE_URL } from "@/lib/seo/constants";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

type EvolvingStoryPageProps = {
  bundle: EvolvingCoverageBundle;
};

export function buildLiveCoverageMetadata(
  bundle: EvolvingCoverageBundle
): Metadata {
  const title =
    bundle.event.coverage_headline ??
    `${bundle.event.canonical_title} Live Updates`;
  const description =
    bundle.event.event_summary ??
    `Ongoing coverage from ${bundle.event.source_count} sources — Hamar Chhattisgarh live desk.`;

  return buildPageMetadata({
    title,
    description,
    path: `/live/${bundle.event.coverage_slug}`,
    ogType: "article",
    section: bundle.event.category ?? "news",
    keywords: [
      bundle.event.category ?? "news",
      bundle.event.region ?? "chhattisgarh",
      "live updates",
    ],
  });
}

export function EvolvingStoryPage({ bundle }: EvolvingStoryPageProps) {
  const { event, article, timeline, liveBlocks, confidence } = bundle;
  const headline =
    event.coverage_headline ?? `${event.canonical_title} · Live Updates`;
  const canonicalUrl = `${SITE_URL}/live/${event.coverage_slug}`;

  const breadcrumbs = [
    buildHomeBreadcrumb(),
    {
      name: "Live coverage",
      href: "/category/politics",
    },
    { name: headline.slice(0, 80), href: `/live/${event.coverage_slug}` },
  ];

  const heroDisplay = article
    ? buildEditorialHeroDisplay({
        heroUrl: article.hero_image_url,
        category: article.tags[0] ?? event.category ?? "local",
        region: event.region,
        imageMeta: article.editorial_metadata?.image,
      })
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LiveBlogPosting",
    headline,
    description: event.event_summary,
    url: canonicalUrl,
    datePublished: event.created_at,
    dateModified: event.updated_at,
    coverageStartTime: event.created_at,
    publisher: {
      "@type": "NewsMediaOrganization",
      name: "Hamar Chhattisgarh",
    },
  };

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <article className="evolving-story" data-live-coverage="true">
        <div className="evolving-story__shell">
          <StoryBreadcrumbs items={breadcrumbs} />

          <header className="evolving-story__header">
            <p className="evolving-story__kicker">
              <span className="evolving-story__live-pill">Live</span>
              {event.source_count} sources · {event.category}
              {event.region ? ` · ${event.region}` : ""}
            </p>
            <h1 className="evolving-story__headline">{headline}</h1>
            <ClusterConfidenceBadge report={confidence} />
          </header>

          {heroDisplay ? (
            <StoryHeroImage
              src={heroDisplay.src}
              fallbackSrc={heroDisplay.fallbackSrc}
              sizes={heroDisplay.sizes}
              alt={headline}
            />
          ) : null}

          {event.event_summary ? (
            <StorySummaryBox summary={event.event_summary} />
          ) : null}

          <LiveUpdateFeed blocks={liveBlocks} />

          <CoverageTimeline events={timeline} />

          {article ? (
            <section className="evolving-story__synthesis">
              <h2 className="evolving-story__synthesis-title">
                Desk synthesis
              </h2>
              <p className="evolving-story__synthesis-deck">{article.summary}</p>
              <Link
                href={`/story/${article.slug}`}
                className="evolving-story__story-link"
              >
                Read full story →
              </Link>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}

export function evolvingCoverageToArticle(bundle: EvolvingCoverageBundle) {
  if (bundle.article) return generatedToNewsArticle(bundle.article);
  return null;
}
