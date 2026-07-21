"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchHit } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchDistrict, SearchTimeScope } from "@/lib/search/types";
import { DesktopPrimaryNav } from "../components/DesktopPrimaryNav";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SecondaryStory } from "../components/SecondaryStory";
import { JdIcon } from "../components/icons";
import { Tag } from "../components/primitives";
import { useJdDsT } from "../i18n";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
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
  activeCategory?: HomeSectionId | null;
  activeDistrict?: SearchDistrict | null;
  activeTime?: SearchTimeScope | null;
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

function buildHref(opts: {
  q: string;
  category?: string | null;
  district?: string | null;
  time?: string | null;
}) {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.category) p.set("category", opts.category);
  if (opts.district) p.set("district", opts.district);
  if (opts.time && opts.time !== "all") p.set("time", opts.time);
  const s = p.toString();
  return s ? `/search?${s}` : "/search";
}

type FilterOption = { id: string; labelHi: string; labelEn: string; param: "category" | "district" | "time"; value: string | null };

function SearchFilterGroup({
  title,
  options,
  locale,
  isActive,
  optionHref,
  onSelect,
}: {
  title: string;
  options: FilterOption[];
  locale: "hi" | "en";
  isActive: (opt: FilterOption) => boolean;
  optionHref: (opt: FilterOption) => string;
  onSelect?: () => void;
}) {
  return (
    <div className="jd-search-filter-group">
      <div className="jd-search-filter-group__title">{title}</div>
      <ul>
        {options.map((opt) => {
          const on = isActive(opt);
          return (
            <li key={opt.id}>
              <Link
                href={optionHref(opt)}
                className={on ? "is-active" : undefined}
                aria-current={on ? "true" : undefined}
                onClick={onSelect}
              >
                <span className="jd-search-check" aria-hidden>
                  {on ? "✓" : ""}
                </span>
                {locale === "en" ? opt.labelEn : opt.labelHi}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A7 / D08 — search results with SoT filter rail (real URL filters only). */
export function SearchResultsPageView({
  query,
  total,
  hits,
  topicSuggestion,
  activeCategory = null,
  activeDistrict = null,
  activeTime = "all",
}: Props) {
  const { t, locale } = useJdDsT();
  const { setSearchOpen } = useReaderPreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stories = hits.map(hitToStory);

  const typeOptions: FilterOption[] = [
    { id: "all-type", labelHi: "सभी", labelEn: "All", param: "category", value: null },
    { id: "india", labelHi: "भारत", labelEn: "India", param: "category", value: "india" },
    { id: "sports", labelHi: "खेल", labelEn: "Sports", param: "category", value: "sports" },
    { id: "business", labelHi: "व्यापार", labelEn: "Business", param: "category", value: "business" },
    { id: "politics", labelHi: "राजनीति", labelEn: "Politics", param: "category", value: "politics" },
  ];

  const timeOptions: FilterOption[] = [
    { id: "all", labelHi: "सभी समय", labelEn: "All time", param: "time", value: "all" },
    { id: "today", labelHi: "आज", labelEn: "Today", param: "time", value: "today" },
    { id: "week", labelHi: "इस सप्ताह", labelEn: "This week", param: "time", value: "week" },
  ];

  const districtOptions: FilterOption[] = [
    { id: "d-all", labelHi: "सभी ज़िले", labelEn: "All districts", param: "district", value: null },
    { id: "chhattisgarh", labelHi: "छत्तीसगढ़", labelEn: "Chhattisgarh", param: "district", value: "chhattisgarh" },
    { id: "raipur", labelHi: "रायपुर", labelEn: "Raipur", param: "district", value: "raipur" },
    { id: "bilaspur", labelHi: "बिलासपुर", labelEn: "Bilaspur", param: "district", value: "bilaspur" },
    { id: "durg", labelHi: "दुर्ग", labelEn: "Durg", param: "district", value: "durg" },
  ];

  const applied = useMemo(() => {
    const chips: Array<{ label: string; clearHref: string }> = [];
    if (activeCategory) {
      chips.push({
        label: locale === "en" ? `Category: ${activeCategory}` : `श्रेणी: ${activeCategory}`,
        clearHref: buildHref({ q: query, district: activeDistrict, time: activeTime }),
      });
    }
    if (activeDistrict) {
      chips.push({
        label: locale === "en" ? `District: ${activeDistrict}` : `ज़िला: ${activeDistrict}`,
        clearHref: buildHref({ q: query, category: activeCategory, time: activeTime }),
      });
    }
    if (activeTime && activeTime !== "all") {
      chips.push({
        label: locale === "en" ? `Time: ${activeTime}` : `अवधि: ${activeTime}`,
        clearHref: buildHref({ q: query, category: activeCategory, district: activeDistrict }),
      });
    }
    return chips;
  }, [activeCategory, activeDistrict, activeTime, locale, query]);

  function optionHref(opt: FilterOption) {
    if (opt.param === "category") {
      return buildHref({
        q: query,
        category: opt.value,
        district: activeDistrict,
        time: activeTime,
      });
    }
    if (opt.param === "district") {
      return buildHref({
        q: query,
        category: activeCategory,
        district: opt.value,
        time: activeTime,
      });
    }
    return buildHref({
      q: query,
      category: activeCategory,
      district: activeDistrict,
      time: opt.value,
    });
  }

  function isActive(opt: FilterOption) {
    if (opt.param === "category") {
      return (activeCategory ?? null) === (opt.value as HomeSectionId | null);
    }
    if (opt.param === "district") {
      return (activeDistrict ?? null) === (opt.value as SearchDistrict | null);
    }
    return (activeTime ?? "all") === (opt.value ?? "all");
  }

  function renderFilterPanel(key: string) {
    return (
      <aside
        key={key}
        className="jd-search-filter-rail"
        data-testid={key === "rail" ? "jd-search-filter-rail" : undefined}
        aria-label={t("search.filter")}
      >
        <div className="jd-search-filter-rail__head">
          <strong>{t("search.filter")}</strong>
          {applied.length ? (
            <Link href={buildHref({ q: query })} className="jd-search-clear">
              {t("search.clearFilters")}
            </Link>
          ) : null}
        </div>
        <SearchFilterGroup
          title={t("search.filterType")}
          options={typeOptions}
          locale={locale}
          isActive={isActive}
          optionHref={optionHref}
          onSelect={() => setDrawerOpen(false)}
        />
        <SearchFilterGroup
          title={t("search.filterTime")}
          options={timeOptions}
          locale={locale}
          isActive={isActive}
          optionHref={optionHref}
          onSelect={() => setDrawerOpen(false)}
        />
        <SearchFilterGroup
          title={t("search.filterDistrict")}
          options={districtOptions}
          locale={locale}
          isActive={isActive}
          optionHref={optionHref}
          onSelect={() => setDrawerOpen(false)}
        />
        <p className="jd-search-filter-note">{t("search.filterNote")}</p>
      </aside>
    );
  }

  return (
    <ReaderShell activeNav="home">
      <Masthead back pageTitle={t("search.submit")} backHref="/" />
      <DesktopPrimaryNav active="home" />

      <div className="jd-search-hero">
        <div className="jd-desk-inner jd-search-hero__inner">
          <button
            type="button"
            className="jd-search-hero__field"
            onClick={() => setSearchOpen(true)}
            aria-label={t("masthead.searchAria")}
          >
            <JdIcon name="search" size={18} stroke={1.9} color="var(--jd-ink-3)" />
            <span className="jd-serif">{query}</span>
            <span className="jd-search-hero__cta">{t("search.submit")}</span>
          </button>
        </div>
      </div>

      <div className="jd-ui jd-shell jd-search-phone-bar" data-jd-locale={locale}>
        <span>
          {t("search.resultsCount", { q: query, n: total })}
        </span>
        <button
          type="button"
          className="jd-search-open-filters"
          data-testid="jd-search-filter-trigger"
          aria-expanded={drawerOpen}
          aria-controls="jd-search-filter-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          <JdIcon name="filter" size={15} stroke={1.8} color="var(--jd-navy)" />
          {t("search.filter")}
        </button>
      </div>

      <main id="main-content" role="main" className="jd-shell jd-search-layout">
        {renderFilterPanel("rail")}

        <div className="jd-search-main" data-testid="jd-search-results-column">
          <div className="jd-search-meta">
            <span>{t("search.resultsCount", { q: query, n: total })}</span>
            <span className="jd-search-sort">{t("search.sortRelevance")}</span>
          </div>

          {applied.length ? (
            <div className="jd-search-applied" aria-label={t("search.filter")}>
              {applied.map((c) => (
                <Link key={c.label} href={c.clearHref} className="jd-search-applied__chip">
                  {c.label} ×
                </Link>
              ))}
            </div>
          ) : null}

          {topicSuggestion ? (
            <div className="jd-search-topic">
              <div style={{ minWidth: 0 }}>
                <div className="jd-ui" style={{ fontSize: 11, color: "var(--jd-amber)", fontWeight: 800 }}>
                  {topicSuggestion.label ?? t("home.topic")}
                </div>
                <div className="jd-serif" style={{ fontSize: 15, fontWeight: 700 }}>
                  {topicSuggestion.title}
                </div>
              </div>
              <Link href={topicSuggestion.href} className="jd-search-topic__cta">
                {t("search.view")}
              </Link>
            </div>
          ) : null}

          <div className="jd-search-results">
            {stories.length === 0 ? (
              <p className="jd-ui jd-search-empty">{t("search.empty")}</p>
            ) : (
              stories.map((s, i) => (
                <SecondaryStory key={s.slug} story={s} last={i === stories.length - 1} toneIndex={i} />
              ))
            )}
          </div>

          {query ? (
            <div style={{ padding: "8px 0 20px" }}>
              <Tag color="var(--jd-muted)">{t("search.match", { q: query })}</Tag>
            </div>
          ) : null}
        </div>
      </main>

      {drawerOpen ? (
        <div
          id="jd-search-filter-drawer"
          className="jd-search-drawer"
          data-testid="jd-search-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={t("search.filter")}
        >
          <div className="jd-search-drawer__sheet">
            <div className="jd-search-drawer__bar">
              <strong>{t("search.filter")}</strong>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t("masthead.closeAria")}>
                <JdIcon name="close" size={20} stroke={2} color="var(--jd-ink)" />
              </button>
            </div>
            {renderFilterPanel("drawer")}
          </div>
          <button type="button" className="jd-search-drawer__scrim" aria-label={t("masthead.closeAria")} onClick={() => setDrawerOpen(false)} />
        </div>
      ) : null}
    </ReaderShell>
  );
}
