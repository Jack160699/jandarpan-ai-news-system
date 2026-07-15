"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { LivePollResult } from "@/lib/realtime/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

const FALLBACK_HINDI = [
  "छत्तीसगढ़ की हर बड़ी खबर पर जन दर्पण की नज़र",
  "रायपुर समेत सभी जिलों से लगातार अपडेट",
  "तेज़, साफ़ और भरोसेमंद स्थानीय समाचार",
];

const FALLBACK_ENGLISH = [
  "Jan Darpan is tracking every major Chhattisgarh story",
  "Continuous updates from Raipur and every district",
  "Fast, clear and trusted local reporting",
];

export function GlobalLiveBar() {
  const { language } = useLanguage();
  const { setSearchOpen } = useReaderPreferences();
  const [headlines, setHeadlines] = useState<string[] | null>(null);
  const fallback = language === "en" ? FALLBACK_ENGLISH : FALLBACK_HINDI;
  const items = headlines?.length ? headlines : fallback;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/homepage/live", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = (await response.json()) as LivePollResult;
        if (!result.ok) return;
        const next = result.snapshot.breakingTicker
          .map((story) => story.headline?.trim())
          .filter((headline): headline is string => Boolean(headline))
          .slice(0, 6);
        if (next.length) setHeadlines(next);
      } catch {
        // Keep the editorial fallback ticker when live data is unavailable.
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  return (
    <div className="jdp-livebar" aria-label={language === "en" ? "Live updates" : "लाइव अपडेट"}>
      <span className="jdp-livebar__label">
        <span aria-hidden />
        {language === "en" ? "LIVE" : "लाइव"}
      </span>
      <div className="jdp-livebar__viewport">
        <div className="jdp-livebar__track">
          {[...items, ...items].map((headline, index) => (
            <span key={`${headline}-${index}`} className="jdp-livebar__item">
              {headline}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="jdp-livebar__search"
        aria-label={language === "en" ? "Search news" : "समाचार खोजें"}
        onClick={() => setSearchOpen(true)}
      >
        <Search size={19} aria-hidden />
      </button>
    </div>
  );
}
