import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import {
  DesktopPrimaryNav,
  Masthead,
  ReaderShell,
  SecondaryStory,
} from "@/features/reader-ds/components";
import { FollowStoryButton } from "@/features/reader-ds/engagement/FollowStoryButton";
import { ContinuingCoverageTimeline } from "@/features/reader-ds/article/components/ContinuingCoverageTimeline";
import { jdDsT, toJdDsLocale } from "@/features/reader-ds/i18n";
import { buildContinuingCoverage } from "@/lib/events/continuing-coverage";
import { fetchEventClusterArticles } from "@/lib/events/fetch-event-cluster-articles";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { getStoryArticleBySlug } from "@/lib/story/get-story-data";
import { buildHubPageMetadata } from "@/lib/seo";

export const revalidate = 120;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getStoryArticleBySlug(decodeURIComponent(slug));
  const headline =
    (article as { headline?: string } | null)?.headline ||
    (article as { title?: string } | null)?.title;
  return buildHubPageMetadata({
    title: headline
      ? `${headline} · Story Hub · Jan Darpan`
      : `Story Hub · Jan Darpan`,
    description:
      (article as { summary?: string } | null)?.summary ||
      "Developing story hub — latest updates, timeline, and related coverage from Jan Darpan.",
    path: `/hub/${slug}`,
    keywords: ["Chhattisgarh", "developing story", "Jan Darpan"],
  });
}

/**
 * Story Hub foundations — evolving developing-story surface.
 * Reuses event cluster + continuing coverage; does not duplicate articles.
 */
export default async function StoryHubPage({ params }: PageProps) {
  if (!isReaderDesignSystemEnabled()) notFound();

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const generated = await getStoryArticleBySlug(slug);
  if (!generated) notFound();

  const eventId =
    typeof generated.event_id === "string" ? generated.event_id.trim() : null;
  const headline =
    (generated as { headline?: string }).headline?.trim() ||
    (generated as { title?: string }).title?.trim() ||
    slug;
  const summary =
    (generated as { summary?: string }).summary?.trim() ||
    (generated as { description?: string }).description?.trim() ||
    null;
  const publishedAt =
    (generated as { published_at?: string }).published_at || null;
  const imageUrl =
    (generated as { hero_image_url?: string }).hero_image_url ||
    (generated as { image_url?: string }).image_url ||
    null;
  const articleId = String(generated.id);

  const language = await getServerReaderLanguage();
  const locale = toJdDsLocale(language);
  const t = (
    key: Parameters<typeof jdDsT>[1],
    vars?: Record<string, string | number>
  ) => jdDsT(locale, key, vars);

  let coverage = null;
  if (eventId) {
    const clusterArticles = await fetchEventClusterArticles(eventId);
    coverage = buildContinuingCoverage({
      eventId,
      eventTitle: headline,
      articles: clusterArticles,
      currentSlug: slug,
      currentStoryId: articleId,
    });
  }

  const updateCount = coverage?.items.length ?? 1;
  const related = (coverage?.items ?? [])
    .filter((i) => !i.isCurrent)
    .slice(0, 6)
    .map((i) => ({
      slug: i.slug,
      headline: i.headline,
      kicker: locale === "en" ? i.statusLabelEn : i.statusLabelHi,
      publishedAt: i.publishedAt,
    }));

  const whyItMatters =
    summary ||
    coverage?.items.find((i) => i.whatChanged)?.whatChanged ||
    null;

  return (
    <ReaderShell activeNav="latest">
      <Masthead
        back
        backHref={`/story/${slug}`}
        pageTitle={t("hub.developing")}
      />
      <DesktopPrimaryNav active="latest" />
      <main id="main-content" className="jd-shell jd-hub" role="main">
        <p className="jd-ui jd-hub__status">
          <span aria-hidden>●</span>
          {t("hub.developing")}
          {" · "}
          {t("hub.updates", { n: updateCount })}
        </p>
        <h1 className="jd-serif jd-hub__title">{headline}</h1>

        <FollowStoryButton
          articleId={articleId}
          eventId={eventId}
          label={headline}
        />

        <section className="jd-hub__section" aria-labelledby="hub-latest">
          <h2 id="hub-latest" className="jd-serif">
            {t("hub.latest")}
          </h2>
          <SecondaryStory
            story={{
              slug,
              headline,
              summary: summary ?? undefined,
              publishedAt: publishedAt ?? undefined,
              imageUrl,
              kicker: t("hub.latest"),
            }}
            last
          />
        </section>

        {coverage?.showTimeline ? (
          <section className="jd-hub__section" aria-labelledby="hub-timeline">
            <h2 id="hub-timeline" className="jd-serif">
              {t("hub.timeline")}
            </h2>
            <ContinuingCoverageTimeline coverage={coverage} locale={locale} />
          </section>
        ) : null}

        {related.length ? (
          <section className="jd-hub__section" aria-labelledby="hub-previous">
            <h2 id="hub-previous" className="jd-serif">
              {t("hub.previous")}
            </h2>
            {related.map((s, i) => (
              <SecondaryStory
                key={s.slug}
                story={s}
                last={i === related.length - 1}
                toneIndex={i}
              />
            ))}
          </section>
        ) : null}

        {whyItMatters ? (
          <section className="jd-hub__section" aria-labelledby="hub-why">
            <h2 id="hub-why" className="jd-serif">
              {t("hub.why")}
            </h2>
            <p
              className="jd-ui"
              style={{ margin: 0, lineHeight: 1.5, color: "var(--jd-ink-2)" }}
            >
              {whyItMatters}
            </p>
          </section>
        ) : null}

        <p style={{ marginTop: 24 }}>
          <Link
            href={`/story/${slug}`}
            className="jd-ui"
            style={{ fontWeight: 700 }}
          >
            ← {locale === "en" ? "Back to article" : "लेख पर वापस"}
          </Link>
        </p>
      </main>
    </ReaderShell>
  );
}
