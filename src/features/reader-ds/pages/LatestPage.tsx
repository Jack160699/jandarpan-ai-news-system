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
 * Taza — Authoritative Chronological Latest-News Feed.
 * Newest published article first.
 * Clean continuous vertical news stream: [ HH:MM ] + Section + Headline + verified thumbnail.
 * Immediacy-driven, zero full-page reloads, fast Next.js client navigation.
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
  const subtitle = locale === "en" ? "Newest stories first" : "सबसे नई खबरें पहले";

  return (
    <ReaderShell activeNav="latest">
      <Masthead />

      <main id="main-content" role="main" className="jd-shell" style={{ flex: 1, background: "var(--jd-paper)" }}>
        {/* Authoritative Taza Feed Header */}
        <header
          style={{
            padding: "16px 14px 14px",
            background: "#ffffff",
            borderBottom: "2px solid var(--jd-red)",
          }}
          data-testid="jd-taza-header"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--jd-red)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--jd-red)",
                      display: "inline-block",
                      boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.2)",
                    }}
                  />
                  {locale === "en" ? "LIVE STREAM" : "लाइव स्ट्रीम"}
                </span>
                <span style={{ color: "var(--jd-line-2)" }}>•</span>
                <span style={{ fontSize: 12, color: "var(--jd-muted)", fontWeight: 600 }}>
                  {sortedArticles.length} {locale === "en" ? "stories" : "खबरें"}
                </span>
              </div>
              <h1
                className="jd-serif"
                style={{
                  margin: "0 0 2px",
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  fontWeight: 800,
                  color: "var(--jd-ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {pageTitle}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--jd-muted)", fontWeight: 500 }}>
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
          <div className="jd-taza-feed" style={{ paddingBottom: 40 }} data-testid="jd-taza-feed">
            {sortedArticles.map((story, i) => {
              const time = formatStoryTime(story.publishedAt, locale);
              const secKey = (story.section || "").toLowerCase();
              const secStyle = SECTION_STYLES[secKey] ?? { bg: "var(--jd-paper-2, #f1f5f9)", text: "var(--jd-ink)" };
              const showAdAfter = (i + 1) % 6 === 0;

              return (
                <React.Fragment key={story.slug}>
                  <article
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "14px 14px",
                      background: "#ffffff",
                      borderBottom: "1px solid var(--jd-line-2, #e2e8f0)",
                      alignItems: "flex-start",
                      transition: "background 0.15s ease",
                    }}
                    data-testid="jd-taza-story"
                  >
                    {/* Time Badge column */}
                    <div style={{ flexShrink: 0, width: 68, textAlign: "left" }}>
                      <div
                        style={{
                          display: "inline-block",
                          background: "var(--jd-paper-2, #f8fafc)",
                          border: "1px solid var(--jd-line, #e2e8f0)",
                          borderRadius: 3,
                          padding: "2px 5px",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: "var(--jd-navy)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        [ {time.exact} ]
                      </div>
                      <div style={{ fontSize: 10, color: "var(--jd-muted)", marginTop: 4, whiteSpace: "nowrap" }}>
                        {time.relative}
                      </div>
                    </div>

                    {/* Headline and Metadata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            padding: "1px 6px",
                            borderRadius: 2,
                            background: secStyle.bg,
                            color: secStyle.text,
                          }}
                        >
                          {story.categoryLabel || story.section}
                        </span>
                        {story.district && (
                          <span style={{ fontSize: 10.5, color: "var(--jd-muted)", fontWeight: 600 }}>
                            • {story.district}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/story/${story.slug}`}
                        style={{ textDecoration: "none", color: "inherit", display: "block" }}
                      >
                        <h2
                          className="jd-serif"
                          style={{
                            margin: 0,
                            fontSize: "clamp(14.5px, 2.2vw, 16.5px)",
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: "var(--jd-ink)",
                          }}
                        >
                          {story.headline}
                        </h2>
                      </Link>

                      {story.summary && (
                        <p
                          style={{
                            margin: "5px 0 0",
                            fontSize: 12,
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
                    </div>

                    {/* Thumbnail Image where available */}
                    {story.imageUrl && (
                      <Link
                        href={`/story/${story.slug}`}
                        style={{
                          flexShrink: 0,
                          width: 88,
                          aspectRatio: "16 / 10",
                          borderRadius: 4,
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
                          referrerPolicy="no-referrer"
                        />
                      </Link>
                    )}
                  </article>

                  {showAdAfter && (
                    <div style={{ width: "100%", borderBottom: "1px solid var(--jd-line)" }}>
                      <DurgSolarInlineAd index={Math.floor((i + 1) / 6)} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>
    </ReaderShell>
  );
}
