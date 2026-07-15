"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomeArticle } from "@/lib/homepage/types";
import type { LivePollResult } from "@/lib/realtime/types";
import { useLanguage } from "@/providers/LanguageProvider";

type TickerStory = Pick<HomeArticle, "id" | "slug" | "headline">;

export function GlobalLiveBar() {
  const { language } = useLanguage();
  const [stories, setStories] = useState<TickerStory[]>([]);

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
        setStories(
          result.snapshot.breakingTicker
            .filter((story) => Boolean(story.slug && story.headline?.trim()))
            .slice(0, 6)
        );
      } catch {
        // Keep the honest latest-news link when live data is unavailable.
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const tickerStories: TickerStory[] = stories.length
    ? stories
    : [
        {
          id: "latest-link",
          slug: "",
          headline:
            language === "en"
              ? "Open the latest Jan Darpan updates"
              : "जन दर्पण की ताज़ा खबरें खोलें",
        },
      ];
  const repeated = stories.length > 1 ? [...tickerStories, ...tickerStories] : tickerStories;

  return (
    <div className="jdp-livebar" aria-label={language === "en" ? "Live updates" : "लाइव अपडेट"}>
      <span className="jdp-livebar__label">
        <span aria-hidden />
        {language === "en" ? "LIVE" : "लाइव"}
      </span>
      <div className="jdp-livebar__viewport" tabIndex={0}>
        <div className={`jdp-livebar__track${stories.length > 1 ? " is-moving" : ""}`}>
          {repeated.map((story, index) => (
            <Link
              key={`${story.id}-${index}`}
              href={story.slug ? `/story/${story.slug}` : "/#home-atlas-feed"}
              className="jdp-livebar__item"
            >
              {story.headline}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
