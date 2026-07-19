"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { Tag } from "../../components/primitives";
import {
  loadReadingMemory,
  saveReadingMemory,
  type ArticleProgress,
} from "@/lib/reading-memory";
import type { HomeArticle } from "@/lib/homepage/types";
import { storyHref } from "../../utils";

function dayBucket(ts: number): "today" | "yesterday" | "older" {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startY = startToday - 86400000;
  if (d.getTime() >= startToday) return "today";
  if (d.getTime() >= startY) return "yesterday";
  return "older";
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" });
}

/** D31 — reading history from device memory. */
export function ReadingHistoryPage({ catalog }: { catalog: HomeArticle[] }) {
  const [articles, setArticles] = useState<Record<string, ArticleProgress>>({});

  useEffect(() => {
    setArticles(loadReadingMemory().articles);
  }, []);

  const bySlug = useMemo(() => new Map(catalog.map((a) => [a.slug, a])), [catalog]);

  const rows = Object.entries(articles)
    .sort((a, b) => b[1].lastRead - a[1].lastRead)
    .slice(0, 40);

  const groups: Array<{ key: string; label: string; items: typeof rows }> = [
    { key: "today", label: "आज", items: [] },
    { key: "yesterday", label: "कल", items: [] },
    { key: "older", label: "पहले", items: [] },
  ];
  for (const row of rows) {
    const b = dayBucket(row[1].lastRead);
    groups.find((g) => g.key === b)?.items.push(row);
  }

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle="इतिहास" />
      <div
        style={{
          flexShrink: 0,
          padding: "9px 16px",
          background: "var(--jd-paper-2)",
          borderBottom: "1px solid var(--jd-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="jd-ui" style={{ fontSize: 11.5, color: "var(--jd-ink-3)" }}>
          पिछले 30 दिन · केवल आपके डिवाइस पर
        </span>
        <button
          type="button"
          className="jd-ui"
          onClick={() => {
            const mem = loadReadingMemory();
            mem.articles = {};
            saveReadingMemory(mem);
            setArticles({});
          }}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--jd-red)",
            background: "none",
            border: "none",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          साफ़ करें
        </button>
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "6px 16px" }}>
        {rows.length === 0 ? (
          <p className="jd-ui" style={{ color: "var(--jd-muted)", padding: "16px 0" }}>
            पढ़ने का इतिहास यहाँ दिखेगा।
          </p>
        ) : (
          groups.map((g) =>
            g.items.length ? (
              <div key={g.key}>
                <div
                  className="jd-ui"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    color: "var(--jd-muted)",
                    margin: "8px 0 4px",
                  }}
                >
                  {g.label}
                </div>
                {g.items.map(([slug, prog]) => {
                  const art = bySlug.get(slug);
                  const title = art?.headline || prog.title || slug;
                  const kicker = art?.categoryLabel || "ख़बर";
                  return (
                    <Link
                      key={slug}
                      href={storyHref(slug)}
                      style={{
                        display: "flex",
                        gap: 11,
                        padding: "11px 0",
                        borderBottom: "1px solid var(--jd-line-2)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 2 }}>
                          <Tag>{kicker}</Tag>
                        </div>
                        <div
                          className="jd-serif"
                          style={{ fontSize: 14.5, fontWeight: 600, color: "var(--jd-ink)", lineHeight: 1.3 }}
                        >
                          {title}
                        </div>
                      </div>
                      <span className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-muted)" }}>
                        {timeLabel(prog.lastRead)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : null
          )
        )}
      </main>
    </ReaderShell>
  );
}
