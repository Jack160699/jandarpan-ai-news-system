"use client";

import { useEffect, useMemo, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { SecondaryStory } from "../../components/SecondaryStory";
import { EmptyState } from "../../system/EmptyState";
import { useJdDsT } from "../../i18n";
import { loadReadingMemory, toggleBookmark } from "@/lib/reading-memory";
import type { HomeArticle } from "@/lib/homepage/types";
import { toReaderStory } from "../../utils";

type Filter = "all" | "article" | "audio" | "offline";

/** D30 — saved stories from reading memory. */
export function SavedStoriesPage({ catalog }: { catalog: HomeArticle[] }) {
  const { t } = useJdDsT();
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setBookmarks(loadReadingMemory().bookmarks);
  }, []);

  const bySlug = useMemo(() => {
    const m = new Map(catalog.map((a) => [a.slug, a]));
    return m;
  }, [catalog]);

  const items = bookmarks
    .map((slug) => bySlug.get(slug))
    .filter((a): a is HomeArticle => Boolean(a));

  const chips = [
    { label: t("saved.filterAll", { n: items.length }), key: "all" as const },
    { label: t("saved.filterArticle"), key: "article" as const },
    { label: t("saved.filterAudio"), key: "audio" as const },
    { label: t("saved.filterOffline"), key: "offline" as const },
  ];

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle={t("saved.shortTitle")} />
      <div style={{ display: "flex", gap: 8, padding: "9px 14px", borderBottom: "1px solid var(--jd-line)", background: "#fff", overflowX: "auto" }}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className="jd-ui"
            style={{
              flexShrink: 0,
              fontSize: 12.5,
              fontWeight: filter === c.key ? 800 : 600,
              color: filter === c.key ? "#fff" : "var(--jd-navy)",
              background: filter === c.key ? "var(--jd-navy)" : "transparent",
              border: `1px solid ${filter === c.key ? "var(--jd-navy)" : "var(--jd-line)"}`,
              borderRadius: 2,
              padding: "7px 12px",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "0 14px" }}>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((a, i) => (
            <div key={a.slug} style={{ position: "relative" }}>
              <SecondaryStory
                story={toReaderStory(a)}
                last={i === items.length - 1}
                toneIndex={i}
              />
              <button
                type="button"
                aria-label={t("saved.removeAria")}
                onClick={() => {
                  const mem = toggleBookmark(loadReadingMemory(), a.slug);
                  setBookmarks(mem.bookmarks);
                }}
                className="jd-ui"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--jd-red)",
                  background: "var(--jd-paper)",
                  border: "none",
                  cursor: "pointer",
                  minHeight: 32,
                }}
              >
                {t("saved.remove")}
              </button>
            </div>
          ))
        )}
        {filter !== "all" && items.length > 0 ? (
          <p className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)", padding: "8px 0 16px" }}>
            {t("saved.filterHint")}
          </p>
        ) : null}
      </main>
    </ReaderShell>
  );
}
