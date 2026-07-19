"use client";

import { useEffect, useMemo, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { SecondaryStory } from "../../components/SecondaryStory";
import { loadReadingMemory, toggleBookmark } from "@/lib/reading-memory";
import type { HomeArticle } from "@/lib/homepage/types";
import { toReaderStory } from "../../utils";

type Filter = "all" | "article" | "audio" | "offline";

/** D30 — saved stories from reading memory. */
export function SavedStoriesPage({ catalog }: { catalog: HomeArticle[] }) {
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
    { label: `सभी · ${items.length}`, key: "all" as const },
    { label: "लेख", key: "article" as const },
    { label: "ऑडियो", key: "audio" as const },
    { label: "ऑफ़लाइन", key: "offline" as const },
  ];

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle="सहेजे" />
      <div style={{ display: "flex", gap: 8, padding: "9px 14px", borderBottom: "1px solid var(--jd-line)", background: "#fff", overflowX: "auto" }}>
        {chips.map((c, i) => (
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
          <p className="jd-ui" style={{ padding: "20px 0", color: "var(--jd-muted)", fontSize: 13 }}>
            अभी कोई सहेजी कहानी नहीं। लेख पर “सहेजें” टैप करें।
          </p>
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
                aria-label="सहेज से हटाएँ"
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
                हटाएँ
              </button>
            </div>
          ))
        )}
        {filter !== "all" && items.length > 0 ? (
          <p className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)", padding: "8px 0 16px" }}>
            फ़िल्टर दृश्य-केवल है — सहेजी सूची एक ही स्रोत से आती है।
          </p>
        ) : null}
      </main>
    </ReaderShell>
  );
}
