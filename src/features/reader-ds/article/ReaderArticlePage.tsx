import Link from "next/link";
import { Fragment } from "react";
import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { ArticleImage } from "../components/ArticleImage";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { AiSummary, SectionHeader, Tag } from "../components/primitives";
import { SecondaryStory } from "../components/SecondaryStory";
import type { ReaderStory } from "../utils";
import {
  BreakingBanner,
  ExplainerBadge,
  OpinionBadge,
  PremiumRibbon,
  ProgressBar,
  SponsoredBanner,
} from "./components/ArticleBanners";
import { ArticleShareBar } from "./components/ArticleShareBar";
import { AudioInline } from "./components/AudioInline";
import { Byline } from "./components/Byline";
import { ExplainerBody } from "./components/ExplainerBody";
import { KeyPoints } from "./components/KeyPoints";
import { LiveBlogTimeline, type LiveBlogEntry } from "./components/LiveBlogTimeline";
import { NoImagePlaceholder } from "./components/NoImagePlaceholder";
import { OpinionBody } from "./components/OpinionBody";
import { PhotoGallery } from "./components/PhotoGallery";
import { VideoPlayer } from "./components/VideoPlayer";
import { ArticleInlineAd } from "../monetization";
import type { ReaderArticleModel } from "./types";

function storyAsLiveEntries(model: ReaderArticleModel): LiveBlogEntry[] {
  const base = model.article.published_at || new Date().toISOString();
  const baseMs = new Date(base).getTime() || Date.now();
  return model.paragraphs.slice(0, 8).map((p, i) => ({
    id: `${model.slug}-u-${i}`,
    headline: p,
    publishedAt: new Date(baseMs - i * 5 * 60_000).toISOString(),
    isBreaking: i === 0 && model.isBreaking,
  }));
}

function BodyParas({
  paragraphs,
  showInlineAd = false,
}: {
  paragraphs: string[];
  showInlineAd?: boolean;
}) {
  return (
    <>
      {paragraphs.map((p, i) => (
        <Fragment key={i}>
          <p
            className="jd-serif"
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              lineHeight: 1.75,
              color: "var(--jd-ink-2)",
            }}
          >
            {p}
          </p>
          {showInlineAd && i === 0 && paragraphs.length > 1 ? (
            <ArticleInlineAd />
          ) : null}
        </Fragment>
      ))}
    </>
  );
}

function relatedAsStories(
  related: ReaderArticleModel["related"]
): ReaderStory[] {
  return related.map((r) => ({
    slug: r.slug,
    headline: r.headline,
    kicker: r.kicker,
    imageUrl: r.imageUrl,
    publishedAt: r.publishedAt ?? undefined,
  }));
}

function AnalysisPlaceholder({ takeaways }: { takeaways: string[] }) {
  if (!takeaways.length) {
    return (
      <div
        style={{
          border: "1px solid var(--jd-line)",
          borderRadius: 3,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div
          className="jd-ui"
          style={{ fontSize: 10.5, fontWeight: 800, color: "var(--jd-navy)", marginBottom: 8 }}
        >
          गहन विश्लेषण
        </div>
        <p className="jd-ui" style={{ margin: 0, fontSize: 12.5, color: "var(--jd-ink-3)" }}>
          सदस्य विश्लेषण चार्ट उपलब्ध होने पर यहाँ दिखेगा — बिना अनुमानित आँकड़ों के।
        </p>
      </div>
    );
  }
  return (
    <div
      style={{
        border: "1px solid var(--jd-line)",
        borderRadius: 3,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div
        className="jd-ui"
        style={{ fontSize: 10.5, fontWeight: 800, color: "var(--jd-navy)", marginBottom: 8 }}
      >
        गहन विश्लेषण · मुख्य बिंदु
      </div>
      {takeaways.slice(0, 4).map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
          <span style={{ color: "var(--jd-red)", fontWeight: 800 }} aria-hidden>
            •
          </span>
          <span className="jd-ui" style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--jd-ink-2)" }}>
            {t}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Shared editorial storytelling template for B11–B20.
 * Variant layout switches inside one page — no duplicate route trees.
 */
export function ReaderArticlePage({ model }: { model: ReaderArticleModel }) {
  const {
    variant,
    headline,
    kicker,
    summary,
    paragraphs,
    imageUrl,
    imageCaption,
    author,
    role,
    publishedLabel,
    updatedLabel,
    readTime,
    takeaways,
    sponsored,
    related,
    stats,
    article,
    editorialMeta,
    slug,
  } = model;

  if (variant === "photo") {
    const captions = paragraphs.slice(0, 6);
    const images = [
      { src: imageUrl, caption: imageCaption || captions[0] || headline, alt: headline },
      ...captions.slice(1).map((c) => ({
        src: imageUrl,
        caption: c,
        alt: headline,
      })),
    ];
    return (
      <>
        <LiveStoryJsonLd article={article} imageMeta={editorialMeta?.image} />
        <PhotoGallery images={images} kicker={kicker} backHref="/" />
      </>
    );
  }

  if (variant === "live-blog") {
    const entries = storyAsLiveEntries(model);
    return (
      <>
        <LiveStoryJsonLd article={article} imageMeta={editorialMeta?.image} />
        <ReaderShell activeNav="latest">
          <Masthead back backHref="/live" pageTitle="लाइव ब्लॉग" />
          <div
            style={{
              flexShrink: 0,
              background: "var(--jd-navy)",
              color: "var(--jd-paper)",
              padding: "11px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 7,
                  background: "#e05a63",
                  boxShadow: "0 0 8px #e05a63",
                }}
              />
              <span className="jd-ui" style={{ fontSize: 10.5, fontWeight: 800, color: "#e05a63" }}>
                LIVE
              </span>
            </div>
            <h1
              className="jd-serif"
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                lineHeight: 1.3,
                overflowWrap: "anywhere",
              }}
            >
              {headline}
            </h1>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
            <LiveBlogTimeline entries={entries} />
          </div>
        </ReaderShell>
      </>
    );
  }

  const relatedStories = relatedAsStories(related);
  const pullQuote =
    model.intelligence?.editorial?.whyThisMatters?.trim() ||
    (paragraphs.length > 1 ? paragraphs[1].slice(0, 120) : null);
  const isOpinionLike = variant === "opinion" || variant === "editorial";
  const isSponsored = variant === "sponsored";
  const showShareBar = variant === "standard";
  const hideBottomNav = showShareBar;
  const pageTitle = variant === "explainer" ? "एक्सप्लेनर" : undefined;

  const padStyle = {
    padding: isOpinionLike ? "16px 18px" : "12px 16px 8px",
    background: isSponsored ? "#faf6ec" : undefined,
  } as const;

  return (
    <>
      <LiveStoryJsonLd article={article} imageMeta={editorialMeta?.image} />
      <ReaderShell
        activeNav={
          variant === "breaking" || variant === "no-image" ? "latest" : "home"
        }
        hideBottomNav={hideBottomNav}
        bottomPad={showShareBar ? 64 : 72}
      >
        <Masthead back backHref="/" pageTitle={pageTitle} />

        {variant === "breaking" ? <BreakingBanner updatedLabel={updatedLabel} /> : null}
        {variant === "sponsored" ? <SponsoredBanner sponsored={sponsored} /> : null}
        {variant === "premium" ? <PremiumRibbon /> : null}
        {variant === "explainer" ? <ProgressBar progress={0.4} /> : null}

        <div style={{ flex: 1, overflow: "auto" }}>
          {variant === "video" ? (
            <VideoPlayer
              imageUrl={imageUrl}
              alt={headline}
              durationLabel={readTime}
            />
          ) : null}

          <article style={padStyle}>
            {variant === "explainer" ? (
              <ExplainerBadge
                count={Math.min(5, Math.max(2, takeaways.length || paragraphs.length || 5))}
              />
            ) : null}
            {isOpinionLike ? <OpinionBadge editorial={variant === "editorial"} /> : null}

            {variant !== "breaking" &&
            variant !== "sponsored" &&
            variant !== "explainer" &&
            !isOpinionLike ? (
              <Tag>{kicker}</Tag>
            ) : null}

            <h1
              className="jd-serif"
              style={{
                margin:
                  variant === "breaking" || isOpinionLike || isSponsored
                    ? "0 0 10px"
                    : "6px 0 8px",
                fontSize:
                  variant === "video"
                    ? 20
                    : isOpinionLike
                      ? 25
                      : variant === "breaking"
                        ? 23
                        : 24,
                lineHeight: 1.3,
                fontWeight: 700,
                color: "var(--jd-ink)",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {headline}
            </h1>

            {variant === "breaking" ? (
              <KeyPoints points={takeaways.slice(0, 3)} />
            ) : null}

            {variant !== "breaking" &&
            variant !== "explainer" &&
            variant !== "sponsored" &&
            variant !== "no-image" &&
            summary ? (
              <AiSummary>{summary}</AiSummary>
            ) : null}

            {variant !== "breaking" &&
            variant !== "explainer" &&
            variant !== "sponsored" &&
            variant !== "video" &&
            variant !== "no-image" ? (
              <Byline
                author={author}
                role={role}
                timeLabel={publishedLabel}
                readTime={readTime}
              />
            ) : null}

            {variant === "standard" || variant === "premium" ? (
              <AudioInline durationLabel={readTime ? `हिन्दी नैरेशन · ${readTime}` : "हिन्दी नैरेशन"} />
            ) : null}

            {variant === "standard" ? (
              <>
                <ArticleImage
                  src={imageUrl}
                  alt={headline}
                  ratio="lead"
                  tone="city"
                  priority
                  sizes="100vw"
                />
                <div
                  className="jd-ui"
                  style={{
                    fontSize: 10.5,
                    color: "var(--jd-muted)",
                    margin: "6px 0 14px",
                    fontStyle: "italic",
                  }}
                >
                  {imageCaption || (imageUrl ? "फ़ोटो: जनदर्पण" : "दृश्य: संपादकीय प्लेसहोल्डर")}
                </div>
              </>
            ) : null}

            {variant === "no-image" ? (
              <>
                <NoImagePlaceholder />
                <div
                  className="jd-ui"
                  style={{
                    fontSize: 10.5,
                    color: "var(--jd-muted)",
                    margin: "0 0 14px",
                    fontStyle: "italic",
                  }}
                >
                  फ़ोटो: उपलब्ध नहीं
                </div>
              </>
            ) : null}

            {variant === "breaking" ? (
              <div style={{ marginBottom: 12 }}>
                <ArticleImage
                  src={imageUrl}
                  alt={headline}
                  ratio="lead"
                  tone="court"
                  priority
                  sizes="100vw"
                />
              </div>
            ) : null}

            {variant === "sponsored" ? (
              <div style={{ marginBottom: 12 }}>
                <ArticleImage
                  src={imageUrl}
                  alt={headline}
                  ratio="lead"
                  tone="field"
                  priority
                  sizes="100vw"
                />
              </div>
            ) : null}

            {variant === "explainer" ? (
              <ExplainerBody
                takeaways={takeaways}
                paragraphs={paragraphs}
                stats={stats}
              />
            ) : null}

            {isOpinionLike ? (
              <OpinionBody paragraphs={paragraphs} pullQuote={pullQuote} />
            ) : null}

            {variant === "premium" ? (
              <>
                <BodyParas paragraphs={paragraphs.slice(0, 1)} />
                <AnalysisPlaceholder takeaways={takeaways} />
                <BodyParas paragraphs={paragraphs.slice(1)} />
              </>
            ) : null}

            {variant === "standard" ||
            variant === "breaking" ||
            variant === "sponsored" ||
            variant === "no-image" ||
            variant === "video" ? (
              <div style={{ marginTop: variant === "breaking" || variant === "sponsored" ? 12 : 0 }}>
                <BodyParas
                  paragraphs={paragraphs}
                  showInlineAd={
                    variant === "standard" ||
                    variant === "breaking" ||
                    variant === "no-image" ||
                    variant === "video"
                  }
                />
              </div>
            ) : null}

            {variant === "sponsored" ? (
              sponsored?.ctaUrl ? (
                <Link
                  href={sponsored.ctaUrl}
                  className="jd-ui"
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "var(--jd-navy)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 13,
                    padding: "12px 0",
                    borderRadius: 3,
                    textDecoration: "none",
                    marginTop: 16,
                  }}
                >
                  {sponsored.ctaLabel?.trim() || "आवेदन करें"}
                </Link>
              ) : (
                <div
                  className="jd-ui"
                  style={{
                    textAlign: "center",
                    background: "var(--jd-navy)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 13,
                    padding: "12px 0",
                    borderRadius: 3,
                    marginTop: 16,
                  }}
                >
                  {sponsored?.ctaLabel?.trim() || "आवेदन करें"}
                </div>
              )
            ) : null}

            {variant === "video" && relatedStories.length > 0 ? (
              <>
                <div style={{ paddingTop: 6 }}>
                  <SectionHeader title="आगे देखें" />
                </div>
                {relatedStories.slice(0, 3).map((s, i) => (
                  <SecondaryStory
                    key={s.slug}
                    story={{ ...s, kicker: s.kicker ?? "वीडियो" }}
                    last={i === Math.min(2, relatedStories.length - 1)}
                    toneIndex={i}
                  />
                ))}
              </>
            ) : null}

            {variant !== "video" &&
            variant !== "explainer" &&
            relatedStories.length > 0 ? (
              <>
                <div style={{ paddingTop: 4 }}>
                  <SectionHeader title="संबंधित ख़बरें" />
                </div>
                {relatedStories.slice(0, 4).map((s, i) => (
                  <SecondaryStory
                    key={s.slug}
                    story={s}
                    last={i === Math.min(3, relatedStories.length - 1)}
                    toneIndex={i}
                  />
                ))}
              </>
            ) : null}
          </article>
        </div>

        {showShareBar ? <ArticleShareBar slug={slug} /> : null}
      </ReaderShell>
    </>
  );
}
