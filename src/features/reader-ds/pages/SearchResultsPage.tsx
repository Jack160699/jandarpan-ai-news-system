"use client";

import Link from "next/link";
import type { SearchHit } from "@/lib/search/types";
import { DesktopPrimaryNav } from "../components/DesktopPrimaryNav";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SecondaryStory } from "../components/SecondaryStory";
import { JdIcon } from "../components/icons";
import { Tag } from "../components/primitives";
import { useJdDsT } from "../i18n";
import type { ReaderStory } from "../utils";

type TopicSuggestion = {
  title: string;
  href: string;
  label?: string;
};

type Props = {
  query: string;
  total: number;
  hits: SearchHit[];
  topicSuggestion?: TopicSuggestion | null;
};

function hitToStory(hit: SearchHit): ReaderStory {
  return {
    slug: hit.slug,
    headline: hit.headline,
    kicker: hit.section,
    summary: hit.summary,
    imageUrl: hit.imageUrl,
    publishedAt: hit.publishedAt,
  };
}

/** A7 — search results (chrome i18n; hit headlines remain CMS). */
export function SearchResultsPageView({ query, total, hits, topicSuggestion }: Props) {
  const { t, locale } = useJdDsT();
  const stories = hits.map(hitToStory);

  return (
    <ReaderShell activeNav="home">
      <Masthead back pageTitle={t("search.submit")} backHref="/" />
      <DesktopPrimaryNav active="home" />
      <div
        className="jd-ui jd-shell"
        data-jd-locale={locale}
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          background: "#fff",
          borderBottom: "1px solid var(--jd-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: locale === "en" ? 11.5 : 12.5,
            color: "var(--jd-ink-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {t("search.resultsCount", { q: query, n: total })}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--jd-navy)",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <JdIcon name="filter" size={15} stroke={1.8} color="var(--jd-navy)" />
          {t("search.filter")}
        </span>
      </div>

      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        {topicSuggestion ? (
          <div
            style={{
              margin: "10px 14px",
              background: "#fbf3e6",
              border: "1px solid var(--jd-gold)",
              borderRadius: 2,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="jd-ui" style={{ fontSize: 11, color: "var(--jd-amber)", fontWeight: 800 }}>
                {topicSuggestion.label ?? t("home.topic")}
              </div>
              <div
                className="jd-serif"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--jd-ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {topicSuggestion.title}
              </div>
            </div>
            <Link
              href={topicSuggestion.href}
              className="jd-ui"
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: "#fff",
                background: "var(--jd-red)",
                padding: "6px 12px",
                borderRadius: 2,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              {t("search.view")}
            </Link>
          </div>
        ) : null}

        <div className="jd-search-results" style={{ padding: "0 14px" }}>
          {stories.length === 0 ? (
            <p className="jd-ui" style={{ padding: "20px 0", color: "var(--jd-muted)", fontSize: 14 }}>
              {t("search.empty")}
            </p>
          ) : (
            stories.map((s, i) => (
              <SecondaryStory key={s.slug} story={s} last={i === stories.length - 1} toneIndex={i} />
            ))
          )}
        </div>

        {query ? (
          <div style={{ padding: "8px 14px 20px" }}>
            <Tag color="var(--jd-muted)">{t("search.match", { q: query })}</Tag>
          </div>
        ) : null}
      </main>
    </ReaderShell>
  );
}
