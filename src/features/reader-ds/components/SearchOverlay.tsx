"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { JdIcon } from "./icons";

const RECENT_KEY = "jd-ds-recent-searches";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(items: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    /* ignore */
  }
}

/**
 * A6 search overlay — opens from masthead search via ReaderPreferences.searchOpen.
 * Hindi + English input; submits to real `/search?q=` results route.
 */
export function SearchOverlay({ trending: trendingProp = [] }: { trending?: string[] }) {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>(trendingProp);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!searchOpen) return;
    setRecent(readRecent());
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);

    let cancelled = false;
    if (trendingProp.length === 0) {
      fetch("/api/search?q=&limit=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { trending?: string[] } | null) => {
          if (!cancelled && Array.isArray(data?.trending)) {
            setTrending(data.trending.filter((x): x is string => typeof x === "string"));
          }
        })
        .catch(() => {
          /* graceful empty */
        });
    } else {
      setTrending(trendingProp);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, setSearchOpen, trendingProp]);

  if (!searchOpen) return null;

  const go = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...readRecent().filter((r) => r !== trimmed)].slice(0, 8);
    writeRecent(next);
    setSearchOpen(false);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    });
  };

  const removeRecent = (item: string) => {
    const next = readRecent().filter((r) => r !== item);
    writeRecent(next);
    setRecent(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="खोज"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "var(--jd-paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          background: "var(--jd-navy)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="बंद करें"
          onClick={() => setSearchOpen(false)}
          style={{
            display: "flex",
            background: "none",
            border: "none",
            padding: 8,
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--jd-gold-soft)",
          }}
        >
          <JdIcon name="arrowL" size={22} stroke={2} color="var(--jd-gold-soft)" />
        </button>
        <form
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            go(query);
          }}
        >
          <JdIcon name="search" size={18} stroke={1.9} color="var(--jd-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="खोजें…"
            aria-label="खोज इनपुट"
            className="jd-ui"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--jd-ink)",
              background: "transparent",
              fontFamily: "inherit",
            }}
          />
        </form>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div
          className="jd-ui"
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "var(--jd-muted)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          हालिया खोजें
        </div>
        {recent.length === 0 ? (
          <p className="jd-ui" style={{ fontSize: 13, color: "var(--jd-muted)", margin: "0 0 8px" }}>
            अभी कोई हालिया खोज नहीं
          </p>
        ) : (
          recent.map((s) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid var(--jd-line-2)",
              }}
            >
              <JdIcon name="clock" size={16} stroke={1.7} color="var(--jd-muted)" />
              <button
                type="button"
                onClick={() => go(s)}
                className="jd-ui"
                style={{
                  flex: 1,
                  textAlign: "left",
                  fontSize: 14,
                  color: "var(--jd-ink-2)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  minHeight: 44,
                }}
              >
                {s}
              </button>
              <button
                type="button"
                aria-label={`${s} हटाएँ`}
                onClick={() => removeRecent(s)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 8,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <JdIcon name="close" size={14} stroke={1.9} color="var(--jd-muted)" />
              </button>
            </div>
          ))
        )}

        <div
          className="jd-ui"
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "var(--jd-muted)",
            textTransform: "uppercase",
            margin: "18px 0 10px",
          }}
        >
          अभी ट्रेंडिंग
        </div>
        {trending.length === 0 ? (
          <p className="jd-ui" style={{ fontSize: 13, color: "var(--jd-muted)", margin: 0 }}>
            ट्रेंडिंग सुझाव उपलब्ध होने पर यहाँ दिखेंगे
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {trending.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => go(s)}
                className="jd-ui"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--jd-navy)",
                  border: "1px solid var(--jd-line)",
                  borderRadius: 2,
                  padding: "7px 12px",
                  background: "#fff",
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
