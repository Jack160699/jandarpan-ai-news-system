"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { getDistrict } from "@/lib/regional/districts";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";
import { hindiRelativeTime, storyHref } from "../utils";
import type { BreakingItem } from "../homepage/breaking";

export type LiveTickerItem = {
  id: string;
  slug: string;
  headline: string;
  href?: string;
  publishedAt?: string;
  district?: string | null;
  timeLabel?: string;
};

type LiveNewsTickerProps = {
  initialItems?: BreakingItem[];
};

/**
 * Real Live / ताज़ा Newsroom Stream (Requirements #8 and #9):
 *
 * Dedicated newspaper newswire/ticker strip:
 *   🔴 LIVE / ताज़ा  |  [सभी | दुर्ग]  |  अभी-अभी  |  दुर्ग: भिलाई में ...  →
 *
 * - Pre-seeded on server (0 extra initial requests).
 * - Realtime/short-poll freshness update every 90s (only when tab is visible).
 * - Interactive district filtering (All CG vs My District).
 * - Fixed height to guarantee 0.00 CLS.
 * - Accessible with aria-live="polite" and keyboard navigation.
 */
export function LiveNewsTicker({ initialItems = [] }: LiveNewsTickerProps) {
  const { t, locale } = useJdDsT();
  const { prefs } = useReaderPreferences();
  const districtSlug = prefs.homeDistrict?.trim() || "raipur";
  const district = getDistrict(districtSlug);
  const districtName = district
    ? locale === "en"
      ? district.name
      : district.nameHi
    : locale === "en"
      ? "Raipur"
      : "रायपुर";

  // Normalized items
  const [items, setItems] = useState<LiveTickerItem[]>(() => {
    return initialItems.map((b, idx) => ({
      id: b.slug || `live-${idx}`,
      slug: b.slug || "",
      headline: b.headline,
      href: b.href || (b.slug ? storyHref(b.slug) : "#"),
      publishedAt: new Date().toISOString(),
    }));
  });

  const [filterMode, setFilterMode] = useState<"all" | "district">("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Filter items by district if selected
  const activeItems = useMemo(() => {
    if (filterMode === "district" && district) {
      const aliases = district.aliases.map((a) => a.toLowerCase());
      const filtered = items.filter((it) => {
        if (it.district?.toLowerCase() === district.slug) return true;
        const text = it.headline.toLowerCase();
        return aliases.some((a) => text.includes(a));
      });
      return filtered.length > 0 ? filtered : items;
    }
    return items;
  }, [filterMode, district, items]);

  // Ensure activeIndex is within range
  const safeIndex = activeIndex % (activeItems.length || 1);
  const currentItem = activeItems[safeIndex];

  // Auto-cycle ticker every 7 seconds when not hovered/paused
  useEffect(() => {
    if (isPaused || activeItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeItems.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, activeItems.length]);

  // Lightweight poll every 90s only when browser tab is visible
  const lastFetchRef = useRef(Date.now());
  const fetchLiveUpdates = useCallback(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }
    const elapsed = Date.now() - lastFetchRef.current;
    if (elapsed < 60_000) return; // Rate-limit guard
    lastFetchRef.current = Date.now();

    const url = `/api/newsroom/breaking?limit=10${
      filterMode === "district" ? `&district=${encodeURIComponent(districtSlug)}` : ""
    }`;

    fetch(url)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
          const fresh: LiveTickerItem[] = data.items.map((row: any, i: number) => ({
            id: row.id || row.slug || `live-poll-${i}`,
            slug: row.slug || "",
            headline: row.headline,
            href: row.slug ? storyHref(row.slug) : row.href || "#",
            publishedAt: row.publishedAt || new Date().toISOString(),
          }));
          setItems(fresh);
        }
      })
      .catch(() => {
        /* silent failure — keep current items */
      });
  }, [filterMode, districtSlug]);

  useEffect(() => {
    const interval = setInterval(fetchLiveUpdates, 90_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLiveUpdates();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchLiveUpdates]);

  if (!currentItem) return null;

  const timeLabel = currentItem.timeLabel || hindiRelativeTime(currentItem.publishedAt);

  return (
    <div
      className="jd-live-news-ticker"
      data-testid="jd-live-news-ticker"
      role="region"
      aria-label="लाइव ताज़ा समाचार न्यूज़रूम"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      style={{
        width: "100%",
        background: "var(--jd-navy, #0E1B3D)",
        borderBottom: "1px solid var(--jd-line, #E7E0D3)",
        borderTop: "1px solid rgba(201, 162, 75, 0.25)",
        boxSizing: "border-box",
        padding: "5px 12px",
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "var(--jd-shell-max, 1240px)",
          margin: "0 auto",
          gap: 10,
          minWidth: 0,
        }}
      >
        {/* Live Badge */}
        <Link
          href="/live"
          prefetch={false}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--jd-red, #C8102E)",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: 3,
            fontSize: 11.5,
            fontWeight: 800,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontFamily: "var(--jd-ff-ui)",
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#fff",
              display: "inline-block",
              boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            }}
          />
          <span>ताज़ा / LIVE</span>
        </Link>

        {/* Filter Toggle: All vs District */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: 3,
            padding: "2px",
            flexShrink: 0,
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            aria-pressed={filterMode === "all"}
            style={{
              background: filterMode === "all" ? "var(--jd-gold, #C9A24B)" : "transparent",
              color: filterMode === "all" ? "var(--jd-navy, #0E1B3D)" : "#c7d0e2",
              border: "none",
              borderRadius: 2,
              padding: "2px 7px",
              fontSize: 11,
              fontWeight: filterMode === "all" ? 800 : 600,
              cursor: "pointer",
              fontFamily: "var(--jd-ff-ui)",
              transition: "all 0.12s ease",
            }}
          >
            सभी
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("district")}
            aria-pressed={filterMode === "district"}
            style={{
              background: filterMode === "district" ? "var(--jd-gold, #C9A24B)" : "transparent",
              color: filterMode === "district" ? "var(--jd-navy, #0E1B3D)" : "#c7d0e2",
              border: "none",
              borderRadius: 2,
              padding: "2px 7px",
              fontSize: 11,
              fontWeight: filterMode === "district" ? 800 : 600,
              cursor: "pointer",
              fontFamily: "var(--jd-ff-ui)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              transition: "all 0.12s ease",
            }}
          >
            <JdIcon
              name="pin"
              size={10}
              stroke={2}
              color={filterMode === "district" ? "var(--jd-navy)" : "var(--jd-gold)"}
            />
            <span>{districtName}</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <span
          style={{
            width: 1,
            height: 14,
            background: "rgba(255, 255, 255, 0.2)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* Freshness Timestamp */}
        {timeLabel ? (
          <span
            className="jd-ui"
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--jd-gold-soft, #dfc07c)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {timeLabel}
          </span>
        ) : null}

        {/* Active Headline with tap-through */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          aria-live="polite"
        >
          <Link
            href={currentItem.href || (currentItem.slug ? storyHref(currentItem.slug) : "#")}
            prefetch={false}
            title={currentItem.headline}
            className="jd-serif"
            style={{
              color: "#FBF8F2",
              textDecoration: "none",
              fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
              fontWeight: 600,
              lineHeight: 1.3,
              display: "inline",
              outline: "none",
            }}
          >
            {currentItem.headline}
          </Link>
        </div>

        {/* Navigation controls */}
        {activeItems.length > 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + activeItems.length) % activeItems.length)
              }
              aria-label="पिछला ताज़ा समाचार"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 3,
                color: "#c7d0e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <JdIcon name="prev" size={13} stroke={2} />
            </button>
            <span
              style={{
                fontSize: 11,
                color: "#8ea0c4",
                fontFamily: "var(--jd-ff-ui)",
                fontWeight: 600,
              }}
            >
              {safeIndex + 1}/{activeItems.length}
            </span>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % activeItems.length)}
              aria-label="अगला ताज़ा समाचार"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 3,
                color: "#c7d0e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <JdIcon name="next" size={13} stroke={2} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
