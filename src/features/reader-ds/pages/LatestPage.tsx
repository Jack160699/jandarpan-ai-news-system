"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { HomeArticle } from "@/lib/homepage/types";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { useJdDsT } from "../i18n";

type Props = {
  articles: HomeArticle[];
};

const CATEGORY_TABS: Array<{ key: string; labelHi: string; labelEn: string; sections: string[] }> = [
  { key: "all", labelHi: "सभी खबरें", labelEn: "All Stories", sections: [] },
  { key: "cg", labelHi: "छत्तीसगढ़", labelEn: "Chhattisgarh", sections: ["chhattisgarh", "raipur", "durg", "bilaspur", "bastar"] },
  { key: "national", labelHi: "भारत", labelEn: "National", sections: ["india"] },
  { key: "world", labelHi: "विश्व", labelEn: "World", sections: ["world"] },
  { key: "business", labelHi: "व्यापार", labelEn: "Business", sections: ["business"] },
  { key: "sports", labelHi: "खेल", labelEn: "Sports", sections: ["sports"] },
  { key: "entertainment", labelHi: "मनोरंजन", labelEn: "Entertainment", sections: ["entertainment"] },
  { key: "tech", labelHi: "टेक्नोलॉजी", labelEn: "Tech", sections: ["technology"] },
];

function formatTimeAgo(dateStr?: string, locale: string = "hi"): string {
  if (!dateStr) return locale === "en" ? "Just now" : "अभी";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return locale === "en" ? "Just now" : "अभी";
    if (diffMins < 60) return locale === "en" ? `${diffMins}m ago` : `${diffMins} मि. पहले`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return locale === "en" ? `${diffHours}h ago` : `${diffHours} घंटे पहले`;
    const diffDays = Math.floor(diffHours / 24);
    return locale === "en" ? `${diffDays}d ago` : `${diffDays} दिन पहले`;
  } catch {
    return locale === "en" ? "Today" : "आज";
  }
}

/**
 * Dedicated Latest News Page — Rich editorial article destination.
 * Houses the rich multi-section article presentation relocated from the mobile homepage.
 */
export function LatestPageView({ articles }: Props) {
  const { t, locale } = useJdDsT();
  const [selectedTab, setSelectedTab] = useState<string>("all");

  const sortedArticles = useMemo(() => {
    return [...articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (selectedTab === "all") return sortedArticles;
    const tabObj = CATEGORY_TABS.find((t) => t.key === selectedTab);
    if (!tabObj || tabObj.sections.length === 0) return sortedArticles;
    return sortedArticles.filter((a) => {
      const sec = (a.section || "").toLowerCase();
      const tags = (a.tags || []).map((t) => t.toLowerCase());
      return (
        tabObj.sections.includes(sec) ||
        tabObj.sections.some((s) => tags.includes(s) || tags.includes(`district:${s}`))
      );
    });
  }, [sortedArticles, selectedTab]);

  const leadArticle = filteredArticles[0];
  const supportingArticles = filteredArticles.slice(1);

  const pageTitle = locale === "en" ? "Latest News" : "ताज़ा ख़बरें";
  const subtitle =
    locale === "en"
      ? "Comprehensive editorial coverage across Chhattisgarh, India & World"
      : "छत्तीसगढ़, भारत और दुनिया भर की प्रमुख विस्तृत खबरें";

  return (
    <ReaderShell activeNav="latest">
      <Masthead pageTitle={pageTitle} />

      <main id="main-content" role="main" className="jd-shell" style={{ flex: 1, background: "var(--jd-paper)" }}>
        {/* Editorial Page Header */}
        <header className="jd-latest-header" style={{ padding: "16px 0 12px", borderBottom: "1px solid var(--jd-line)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "var(--jd-ink)", letterSpacing: "-0.02em" }}>
              {pageTitle}
            </h1>
            <span style={{ fontSize: 13, color: "var(--jd-muted)", fontWeight: 600 }}>
              {filteredArticles.length} {locale === "en" ? "stories" : "खबरें"}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--jd-muted)" }}>
            {subtitle}
          </p>

          {/* Category Filter Chips */}
          <nav aria-label="News Categories" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 0 4px", scrollbarWidth: "none" }}>
            {CATEGORY_TABS.map((tab) => {
              const active = selectedTab === tab.key;
              const label = locale === "en" ? tab.labelEn : tab.labelHi;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTab(tab.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    border: active ? "1.5px solid var(--jd-red)" : "1px solid var(--jd-line)",
                    background: active ? "var(--jd-red)" : "var(--jd-paper)",
                    color: active ? "#ffffff" : "var(--jd-ink)",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </header>

        {filteredArticles.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--jd-muted)" }}>
            <p style={{ fontSize: 16 }}>{t("home.latestEmpty")}</p>
          </div>
        ) : (
          <div className="jd-latest-content" style={{ padding: "18px 0 40px" }}>
            {/* Featured Lead Story */}
            {leadArticle && (
              <article
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                  paddingBottom: 20,
                  marginBottom: 24,
                  borderBottom: "2px solid var(--jd-line)",
                }}
              >
                {leadArticle.imageUrl && (
                  <Link href={`/story/${leadArticle.slug}`} prefetch={false} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", borderRadius: 8, overflow: "hidden", background: "#0a1628" }}>
                      <img
                        src={leadArticle.imageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="eager"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </Link>
                )}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--jd-red)", textTransform: "uppercase" }}>
                      {leadArticle.categoryLabel || leadArticle.section}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--jd-muted)" }}>•</span>
                    <span style={{ fontSize: 11.5, color: "var(--jd-muted)" }}>
                      {formatTimeAgo(leadArticle.publishedAt, locale)}
                    </span>
                  </div>
                  <Link href={`/story/${leadArticle.slug}`} prefetch={false} style={{ textDecoration: "none", color: "inherit" }}>
                    <h2 style={{ margin: "0 0 10px", fontSize: "clamp(18px, 2.4vw, 24px)", fontWeight: 800, lineHeight: 1.3, color: "var(--jd-ink)" }}>
                      {leadArticle.headline}
                    </h2>
                  </Link>
                  {leadArticle.summary && (
                    <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: "var(--jd-ink-subtle, #334155)" }}>
                      {leadArticle.summary}
                    </p>
                  )}
                  <Link href={`/story/${leadArticle.slug}`} prefetch={false} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--jd-red)", textDecoration: "none" }}>
                    {locale === "en" ? "Read full story →" : "पूरी खबर पढ़ें →"}
                  </Link>
                </div>
              </article>
            )}

            {/* Rich Grid of Supporting Articles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {supportingArticles.map((story) => (
                <article
                  key={story.slug}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--jd-paper)",
                    border: "1px solid var(--jd-line)",
                    borderRadius: 8,
                    overflow: "hidden",
                    transition: "box-shadow 0.15s ease",
                  }}
                >
                  {story.imageUrl && (
                    <Link href={`/story/${story.slug}`} prefetch={false} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", background: "#0a1628" }}>
                        <img
                          src={story.imageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </Link>
                  )}
                  <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--jd-red)", textTransform: "uppercase" }}>
                          {story.categoryLabel || story.section}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--jd-muted)" }}>•</span>
                        <span style={{ fontSize: 11, color: "var(--jd-muted)" }}>
                          {formatTimeAgo(story.publishedAt, locale)}
                        </span>
                      </div>
                      <Link href={`/story/${story.slug}`} prefetch={false} style={{ textDecoration: "none", color: "inherit" }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 14.5,
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
                      {story.summary && (
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            color: "var(--jd-ink-subtle, #475569)",
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
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>
    </ReaderShell>
  );
}
