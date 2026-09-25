"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import type { HomeArticle } from "@/lib/homepage/types";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { useJdDsT } from "../i18n";
import { DurgSolarInlineAd } from "@/components/ads/DurgSolarInlineAd";

type Props = {
  articles: HomeArticle[];
};

const SECTION_STYLES: Record<string, { bg: string; text: string }> = {
  politics: { bg: "#fef2f2", text: "#b91c1c" },
  crime: { bg: "#fff7ed", text: "#c2410c" },
  national: { bg: "#eff6ff", text: "#1d4ed8" },
  international: { bg: "#ecfdf5", text: "#047857" },
  entertainment: { bg: "#faf5ff", text: "#7e22ce" },
  sports: { bg: "#f0fdf4", text: "#15803d" },
  chhattisgarh: { bg: "#fefce8", text: "#a16207" },
  durg: { bg: "#fefce8", text: "#a16207" },
  raipur: { bg: "#fefce8", text: "#a16207" },
};

function formatStoryTime(dateStr?: string, locale: string = "hi"): { exact: string; relative: string } {
  if (!dateStr) return { exact: "--:--", relative: locale === "en" ? "Live" : "लाइव" };
  try {
    const d = new Date(dateStr);
    const exact = isNaN(d.getTime())
      ? "--:--"
      : d.toLocaleTimeString(locale === "en" ? "en-IN" : "hi-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        });

    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    let relative = locale === "en" ? "Just now" : "अभी";
    if (diffMins >= 5 && diffMins < 60) {
      relative = locale === "en" ? `${diffMins}m ago` : `${diffMins} मि. पहले`;
    } else if (diffMins >= 60 && diffMins < 1440) {
      const h = Math.floor(diffMins / 60);
      relative = locale === "en" ? `${h}h ago` : `${h} घंटे पहले`;
    } else if (diffMins >= 1440) {
      const days = Math.floor(diffMins / 1440);
      relative = locale === "en" ? `${days}d ago` : `${days} दिन पहले`;
    }
    return { exact, relative };
  } catch {
    return { exact: "--:--", relative: locale === "en" ? "Today" : "आज" };
  }
}

/**
 * Taza — Full-Screen Digital Newspaper Newsroom Feed.
 * 
 * Implements strict editorial design:
 * 1. Authoritative IST header with live indicator & story counter
 * 2. Desktop Top Lead Package:
 *    - Left/Main Column: Dominant latest story with large image, headline, and summary
 *    - Right/Supporting Column: Ranked latest stories with images and timestamps
 * 3. Editorial Section Divider: ताज़ा खबरें — निरंतर प्रवाह
 * 4. Full-Width Latest Stream: Responsive 3-column / 2-column editorial grid (desktop)
 *    and structured image-first news cards on mobile (IMAGE -> CATEGORY + TIME -> HEADLINE -> SUMMARY).
 */
export function LatestPageView({ articles }: Props) {
  const { t, locale } = useJdDsT();

  // Primary rule: NEWEST PUBLISHED ARTICLE FIRST by authoritative publication timestamp
  const sortedArticles = useMemo(() => {
    return [...articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [articles]);

  const pageTitle = locale === "en" ? "Latest News" : "ताज़ा खबरें";
  const subtitle = locale === "en" ? "Newest stories first · Continuous updates" : "सबसे नई खबरें पहले · निरंतर प्रवाह";

  // Partition into Lead Story, Top Supporting, and Continuous Stream
  const { leadStory, topSupporting, streamStories } = useMemo(() => {
    const leadStory = sortedArticles[0] ?? null;
    const topSupporting = sortedArticles.slice(1, 5);
    const streamStories = sortedArticles.slice(5);
    return { leadStory, topSupporting, streamStories };
  }, [sortedArticles]);

  return (
    <ReaderShell activeNav="latest">
      <Masthead />

      <main
        id="main-content"
        role="main"
        className="jd-shell"
        style={{
          flex: 1,
          background: "var(--jd-paper)",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
          padding: "16px 14px 48px",
        }}
      >
        {/* Authoritative Taza Feed Header */}
        <header
          style={{
            padding: "18px 20px",
            background: "#ffffff",
            border: "1px solid var(--jd-line, #e2e8f0)",
            borderLeft: "4px solid var(--jd-red)",
            borderRadius: 4,
            marginBottom: 20,
          }}
          data-testid="jd-taza-header"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--jd-red)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--jd-red)",
                      display: "inline-block",
                      boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.25)",
                    }}
                  />
                  {locale === "en" ? "LIVE NEWS WIRE" : "ताज़ा समाचार प्रवाह"}
                </span>
                <span style={{ color: "var(--jd-line-2)" }}>•</span>
                <span style={{ fontSize: 12, color: "var(--jd-muted)", fontWeight: 700 }}>
                  {sortedArticles.length} {locale === "en" ? "verified stories" : "सत्यापित खबरें"}
                </span>
              </div>
              <h1
                className="jd-serif"
                style={{
                  margin: "0 0 3px",
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 800,
                  color: "var(--jd-ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {pageTitle}
              </h1>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--jd-muted)", fontWeight: 500 }}>
                {subtitle}
              </p>
            </div>
          </div>
        </header>

        {sortedArticles.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--jd-muted)" }}>
            <p style={{ fontSize: 15 }}>{t("home.latestEmpty")}</p>
          </div>
        ) : (
          <div className="jd-taza-container" data-testid="jd-taza-feed">
            {/* 1. TOP EDITORIAL PACKAGE: Desktop 2-column (Lead + Supporting) */}
            {leadStory && (
              <section
                aria-label={locale === "en" ? "Featured Latest Story" : "ताज़ा मुख्य खबर"}
                style={{ marginBottom: 28 }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                    gap: 20,
                    alignItems: "stretch",
                  }}
                >
                  {/* Left / Main Column: Dominant latest story */}
                  <article
                    style={{
                      gridColumn: "span 1",
                      background: "#ffffff",
                      border: "1px solid var(--jd-line, #e2e8f0)",
                      borderRadius: 4,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    {leadStory.imageUrl && (
                      <Link
                        href={`/story/${leadStory.slug}`}
                        style={{ display: "block", position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", background: "#0a1628" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={leadStory.imageUrl}
                          alt={leadStory.headline}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="eager"
                        />
                        <span
                          style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            background: "var(--jd-red)",
                            color: "#ffffff",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: ".06em",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 2,
                          }}
                        >
                          {locale === "en" ? "LATEST LEAD" : "ताज़ा लीड"}
                        </span>
                      </Link>
                    )}

                    <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        {(() => {
                          const time = formatStoryTime(leadStory.publishedAt, locale);
                          const secKey = (leadStory.section || "").toLowerCase();
                          const secStyle = SECTION_STYLES[secKey] ?? { bg: "var(--jd-paper-2, #f1f5f9)", text: "var(--jd-ink)" };
                          return (
                            <>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  letterSpacing: ".04em",
                                  textTransform: "uppercase",
                                  padding: "2px 7px",
                                  borderRadius: 2,
                                  background: secStyle.bg,
                                  color: secStyle.text,
                                }}
                              >
                                {leadStory.categoryLabel || leadStory.section}
                              </span>
                              <span
                                style={{
                                  fontFamily: "ui-monospace, monospace",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "var(--jd-navy)",
                                  background: "var(--jd-paper-2, #f8fafc)",
                                  border: "1px solid var(--jd-line, #e2e8f0)",
                                  borderRadius: 2,
                                  padding: "1px 5px",
                                }}
                              >
                                [ {time.exact} ]
                              </span>
                              <span style={{ fontSize: 11, color: "var(--jd-muted)", fontWeight: 600 }}>
                                {time.relative}
                              </span>
                            </>
                          );
                        })()}
                      </div>

                      <Link
                        href={`/story/${leadStory.slug}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <h2
                          className="jd-serif"
                          style={{
                            margin: "0 0 10px",
                            fontSize: "clamp(18px, 2.2vw, 24px)",
                            fontWeight: 800,
                            lineHeight: 1.3,
                            color: "var(--jd-ink)",
                          }}
                        >
                          {leadStory.headline}
                        </h2>
                      </Link>

                      {leadStory.summary && (
                        <p
                          style={{
                            margin: "0 0 14px",
                            fontSize: 13.5,
                            lineHeight: 1.55,
                            color: "var(--jd-ink-2, #334155)",
                            flex: 1,
                          }}
                        >
                          {leadStory.summary}
                        </p>
                      )}

                      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--jd-line, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--jd-muted)", fontWeight: 600 }}>
                          {leadStory.district ? `📍 ${leadStory.district}` : "जन दर्पण ब्यूरो"}
                        </span>
                        <Link
                          href={`/story/${leadStory.slug}`}
                          style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-red)", textDecoration: "none" }}
                        >
                          {locale === "en" ? "Read full report ›" : "पूरी खबर पढ़ें ›"}
                        </Link>
                      </div>
                    </div>
                  </article>

                  {/* Right / Supporting Column: Several latest stories */}
                  {topSupporting.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          color: "var(--jd-navy)",
                          borderBottom: "2px solid var(--jd-navy)",
                          paddingBottom: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{locale === "en" ? "Latest Highlights" : "ताज़ा सुर्खियां"}</span>
                        <span style={{ fontSize: 11, color: "var(--jd-muted)" }}>LIVE</span>
                      </div>

                      {topSupporting.map((story, idx) => {
                        const time = formatStoryTime(story.publishedAt, locale);
                        const secKey = (story.section || "").toLowerCase();
                        const secStyle = SECTION_STYLES[secKey] ?? { bg: "var(--jd-paper-2, #f1f5f9)", text: "var(--jd-ink)" };

                        return (
                          <article
                            key={story.slug}
                            style={{
                              display: "flex",
                              gap: 12,
                              padding: "12px",
                              background: "#ffffff",
                              border: "1px solid var(--jd-line, #e2e8f0)",
                              borderRadius: 4,
                              alignItems: "center",
                            }}
                          >
                            {story.imageUrl && (
                              <Link
                                href={`/story/${story.slug}`}
                                style={{
                                  flexShrink: 0,
                                  width: 100,
                                  aspectRatio: "16 / 10",
                                  borderRadius: 3,
                                  overflow: "hidden",
                                  background: "#0a1628",
                                  display: "block",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={story.imageUrl}
                                  alt=""
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                  loading="lazy"
                                />
                              </Link>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    padding: "1px 5px",
                                    borderRadius: 2,
                                    background: secStyle.bg,
                                    color: secStyle.text,
                                  }}
                                >
                                  {story.categoryLabel || story.section}
                                </span>
                                <span
                                  style={{
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "var(--jd-muted)",
                                  }}
                                >
                                  [ {time.exact} ]
                                </span>
                              </div>

                              <Link
                                href={`/story/${story.slug}`}
                                style={{ textDecoration: "none", color: "inherit", display: "block" }}
                              >
                                <h3
                                  className="jd-serif"
                                  style={{
                                    margin: 0,
                                    fontSize: "clamp(13.5px, 1.8vw, 15px)",
                                    fontWeight: 700,
                                    lineHeight: 1.35,
                                    color: "var(--jd-ink)",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {story.headline}
                                </h3>
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Commercial break: Durg Solar */}
            <div style={{ margin: "20px 0 28px" }}>
              <DurgSolarInlineAd index={0} />
            </div>

            {/* 2. FULL-WIDTH LATEST STREAM HEADER */}
            {streamStories.length > 0 && (
              <section aria-label={locale === "en" ? "Continuous Stream" : "निरंतर समाचार धारा"}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 8,
                    marginBottom: 20,
                    borderBottom: "2px solid var(--jd-red)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 4,
                        height: 18,
                        background: "var(--jd-red)",
                        display: "inline-block",
                        borderRadius: 2,
                      }}
                    />
                    <h2
                      className="jd-serif"
                      style={{
                        margin: 0,
                        fontSize: "clamp(18px, 2.8vw, 22px)",
                        fontWeight: 800,
                        color: "var(--jd-ink)",
                      }}
                    >
                      {locale === "en" ? "Continuous Latest Feed" : "ताज़ा खबरें — निरंतर प्रवाह"}
                    </h2>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-muted)" }}>
                    {streamStories.length} {locale === "en" ? "more stories" : "और खबरें"}
                  </span>
                </div>

                {/* Multi-column editorial card grid on desktop, full-width rich cards on mobile */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                    gap: 18,
                  }}
                >
                  {streamStories.map((story, i) => {
                    const time = formatStoryTime(story.publishedAt, locale);
                    const secKey = (story.section || "").toLowerCase();
                    const secStyle = SECTION_STYLES[secKey] ?? { bg: "var(--jd-paper-2, #f1f5f9)", text: "var(--jd-ink)" };
                    const showAdAfter = (i + 1) % 6 === 0;

                    return (
                      <React.Fragment key={story.slug}>
                        <article
                          style={{
                            background: "#ffffff",
                            border: "1px solid var(--jd-line, #e2e8f0)",
                            borderRadius: 4,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            transition: "box-shadow 0.2s ease, transform 0.2s ease",
                          }}
                          data-testid="jd-taza-story"
                        >
                          {/* Image */}
                          {story.imageUrl && (
                            <Link
                              href={`/story/${story.slug}`}
                              style={{
                                display: "block",
                                width: "100%",
                                aspectRatio: "16 / 9",
                                overflow: "hidden",
                                background: "#0a1628",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={story.imageUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                loading="lazy"
                              />
                            </Link>
                          )}

                          {/* Body */}
                          <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                            {/* Category + Time */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  letterSpacing: ".04em",
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: 2,
                                  background: secStyle.bg,
                                  color: secStyle.text,
                                }}
                              >
                                {story.categoryLabel || story.section}
                              </span>
                              <span
                                style={{
                                  fontFamily: "ui-monospace, monospace",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: "var(--jd-navy)",
                                  background: "var(--jd-paper-2, #f8fafc)",
                                  border: "1px solid var(--jd-line, #e2e8f0)",
                                  borderRadius: 2,
                                  padding: "1px 5px",
                                }}
                              >
                                [ {time.exact} ]
                              </span>
                              <span style={{ fontSize: 10.5, color: "var(--jd-muted)", fontWeight: 600 }}>
                                • {time.relative}
                              </span>
                            </div>

                            {/* Headline */}
                            <Link
                              href={`/story/${story.slug}`}
                              style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: 6 }}
                            >
                              <h3
                                className="jd-serif"
                                style={{
                                  margin: 0,
                                  fontSize: "clamp(14.5px, 2vw, 16.5px)",
                                  fontWeight: 700,
                                  lineHeight: 1.35,
                                  color: "var(--jd-ink)",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {story.headline}
                              </h3>
                            </Link>

                            {/* Short Summary */}
                            {story.summary && (
                              <p
                                style={{
                                  margin: "0 0 10px",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                  color: "var(--jd-muted)",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {story.summary}
                              </p>
                            )}

                            {/* Location & Read Link */}
                            <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--jd-line, #f1f5f9)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "var(--jd-muted)", fontWeight: 600 }}>
                                {story.district ? `📍 ${story.district}` : "जन दर्पण"}
                              </span>
                              <Link
                                href={`/story/${story.slug}`}
                                style={{ fontSize: 11.5, fontWeight: 700, color: "var(--jd-red)", textDecoration: "none" }}
                              >
                                {locale === "en" ? "Read ›" : "पढ़ें ›"}
                              </Link>
                            </div>
                          </div>
                        </article>

                        {showAdAfter && (
                          <div style={{ gridColumn: "1 / -1", margin: "10px 0" }}>
                            <DurgSolarInlineAd index={Math.floor((i + 1) / 6)} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </ReaderShell>
  );
}
