"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storyHref } from "../utils";
import type { BreakingItem } from "../homepage/breaking";
import { useJdDsT } from "../i18n";

export type LiveTickerItem = {
  id: string;
  slug: string;
  headline: string;
  href?: string;
  publishedAt?: string;
};

type LiveNewsTickerProps = {
  initialItems?: BreakingItem[];
};

const DEFAULT_HEADLINES: Record<"hi" | "en", LiveTickerItem[]> = {
  hi: [
    {
      id: "live-default-hi-1",
      slug: "",
      headline: "छत्तीसगढ़: प्रदेश व सभी 33 जिलों की ताज़ा खबरें सीधे जन दर्पण न्यूज़रूम से",
      href: "/latest",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "live-default-hi-2",
      slug: "",
      headline: "दुर्ग एवं रायपुर: प्रशासनिक समीक्षा में विकास कार्यों और जनसुविधाओं पर जोर",
      href: "/latest",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "live-default-hi-3",
      slug: "",
      headline: "बिलासपुर व बस्तर: मौसम एवं क्षेत्रीय योजनाओं को लेकर महत्वपूर्ण निर्देश जारी",
      href: "/latest",
      publishedAt: new Date().toISOString(),
    },
  ],
  en: [
    {
      id: "live-default-en-1",
      slug: "",
      headline: "Chhattisgarh: Latest verified news and live updates from all 33 districts",
      href: "/latest",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "live-default-en-2",
      slug: "",
      headline: "Raipur & Durg: Administration reviews regional development and infrastructure projects",
      href: "/latest",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "live-default-en-3",
      slug: "",
      headline: "Bilaspur & Bastar: Key state announcements and administrative updates",
      href: "/latest",
      publishedAt: new Date().toISOString(),
    },
  ],
};

/**
 * Simplified Live News Ticker (Requirements #11-#15):
 * 🔴 LIVE / 🔴 लाइव  |  latest verified news headlines continuously scrolling slow and smooth
 *
 * - Compact red LIVE label with subtle pulsing indicator.
 * - Continuous, calm, slow-scrolling newswire (~70s).
 * - Seamless loop without jumps.
 * - Tap/click on any headline opens corresponding story.
 * - Pauses on hover/focus.
 * - Respects prefers-reduced-motion.
 * - Fully localized: Hindi mode = Hindi ticker & headlines; English mode = English ticker & headlines.
 * - Palette strictly Navy + Red + White/Paper (zero yellow/gold).
 */
export function LiveNewsTicker({ initialItems = [] }: LiveNewsTickerProps) {
  const { locale, isEnglish } = useJdDsT();
  const currentLang = isEnglish ? "en" : "hi";

  const mapInitial = useCallback(
    (lang: "hi" | "en") => {
      if (initialItems && initialItems.length > 0) {
        const filtered = initialItems.filter((b) => {
          const hasDevanagari = /[\u0900-\u097F]/.test(b.headline);
          return lang === "hi" ? hasDevanagari : !hasDevanagari;
        });
        if (filtered.length > 0) {
          return filtered.map((b, idx) => ({
            id: b.slug || `live-${lang}-${idx}`,
            slug: b.slug || "",
            headline: b.headline,
            href: b.href || (b.slug ? storyHref(b.slug) : "#"),
            publishedAt: new Date().toISOString(),
          }));
        }
      }
      return DEFAULT_HEADLINES[lang];
    },
    [initialItems]
  );

  const [items, setItems] = useState<LiveTickerItem[]>(() => mapInitial(currentLang));

  const lastFetchRef = useRef(0);
  const fetchLiveUpdates = useCallback(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }
    const elapsed = Date.now() - lastFetchRef.current;
    if (elapsed < 30_000 && lastFetchRef.current !== 0) return;
    lastFetchRef.current = Date.now();

    fetch(`/api/newsroom/breaking?limit=10&lang=${currentLang}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
          const fresh: LiveTickerItem[] = data.items.map((row: any, i: number) => ({
            id: row.id || row.slug || `live-poll-${currentLang}-${i}`,
            slug: row.slug || "",
            headline:
              currentLang === "en"
                ? row.headlineEn || row.headline
                : row.headlineHi || row.headline,
            href: row.slug ? storyHref(row.slug) : row.href || "#",
            publishedAt: row.publishedAt || new Date().toISOString(),
          }));
          setItems(fresh);
        }
      })
      .catch(() => {});
  }, [currentLang]);

  // Re-sync ticker items whenever the reader changes language
  useEffect(() => {
    setItems(mapInitial(currentLang));
    lastFetchRef.current = 0;
    fetchLiveUpdates();
  }, [currentLang, mapInitial, fetchLiveUpdates]);

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

  // Duplicate items array to make a seamless continuous loop
  const displayItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      className="jd-live-ticker-wrap"
      data-testid="jd-live-news-ticker"
      role="region"
      aria-label={isEnglish ? "Live News Ticker" : "लाइव समाचार"}
      style={{
        width: "100%",
        background: "var(--jd-navy, #0E1B3D)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        boxSizing: "border-box",
        minHeight: 36,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        zIndex: 20,
      }}
    >
      <div
        className="jd-live-ticker-inner"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: "0 16px",
          gap: 14,
          minWidth: 0,
        }}
      >
        {/* Simple red BREAKING label with small pulsing indicator */}
        <Link
          href="/latest"
          prefetch={false}
          className="jd-live-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "var(--jd-red-brand, #C8102E)",
            color: "#ffffff",
            padding: "4px 11px",
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 800,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontFamily: "var(--jd-ff-ui)",
            letterSpacing: "0.06em",
          }}
        >
          <span
            className="jd-live-pulse-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ffffff",
              display: "inline-block",
            }}
          />
          <span>{isEnglish ? "BREAKING" : "ब्रेकिंग"}</span>
        </Link>

        {/* Marquee viewport */}
        <div
          className="jd-live-marquee-box"
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            position: "relative",
            maskImage:
              "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
          }}
        >
          <div className="jd-live-marquee-track">
            {displayItems.map((it, idx) => (
              <span
                key={`${it.id}-${idx}`}
                className="jd-live-item"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  paddingRight: 32,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.45)",
                    fontSize: 9,
                  }}
                  aria-hidden="true"
                >
                  ◆
                </span>
                <Link
                  href={it.href || (it.slug ? storyHref(it.slug) : "#")}
                  prefetch={false}
                  className="jd-live-headline-link jd-serif"
                  style={{
                    color: "#FBF8F2",
                    textDecoration: "none",
                    fontSize: "clamp(15.5px, 1.25vw, 18px)",
                    fontWeight: 500,
                    lineHeight: 1.35,
                    outline: "none",
                  }}
                >
                  {it.headline}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes jd-marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes jd-live-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.8);
          }
        }
        .jd-live-pulse-dot {
          animation: jd-live-pulse 2s ease-in-out infinite;
        }
        .jd-live-marquee-track {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          will-change: transform;
          animation: jd-marquee-scroll 70s linear infinite;
        }
        .jd-live-ticker-wrap:hover .jd-live-marquee-track,
        .jd-live-ticker-wrap:focus-within .jd-live-marquee-track {
          animation-play-state: paused;
        }
        .jd-live-headline-link:hover,
        .jd-live-headline-link:focus {
          color: #ffffff !important;
          text-decoration: underline;
        }
        @media (max-width: 767px) {
          .jd-live-ticker-wrap {
            display: none !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .jd-live-marquee-track {
            animation: none !important;
          }
          .jd-live-pulse-dot {
            animation: none !important;
          }
          .jd-live-marquee-box {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
