"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { getDistrict } from "@/lib/regional/districts";
import { useJdDsT } from "../i18n";
import { useDistrictWeather } from "../hooks/useDistrictWeather";
import { JdIcon } from "./icons";
import {
  DESK_CAT_ITEMS,
  DESK_CAT_ITEMS_COMPACT,
  resolveDeskCatActive,
  type DeskCatKey,
} from "./deskCatItems";

/**
 * Desktop / tablet editorial chrome (SoT H01–H04).
 * Mounted from ReaderShell; phone masthead stays for <768 via CSS.
 */
export function DeskChrome() {
  const { t, locale } = useJdDsT();
  const { language, setLanguage } = useLanguage();
  const { prefs, setSearchOpen } = useReaderPreferences();
  const pathname = usePathname() || "/";
  const active = resolveDeskCatActive(pathname);
  const districtSlug = prefs.homeDistrict?.trim() || "raipur";
  const weather = useDistrictWeather(districtSlug);
  const [condensed, setCondensed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const district = getDistrict(districtSlug);
  const districtLabel = district
    ? locale === "en"
      ? district.name
      : district.nameHi
    : locale === "en"
      ? "Raipur"
      : "रायपुर";

  const localeTag = locale === "en" ? "en-IN" : "hi-IN";
  let dateLabel = "";
  try {
    dateLabel = new Intl.DateTimeFormat(localeTag, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date());
  } catch {
    dateLabel = "";
  }

  const weatherLabel =
    weather.status === "ok" && weather.tempC != null
      ? `${weather.tempC}°`
      : t("util.weatherUnavailable");

  const catItems = DESK_CAT_ITEMS;
  const compactKeys = new Set<DeskCatKey>(DESK_CAT_ITEMS_COMPACT);

  return (
    <div className="jd-desk-chrome" data-jd-locale={locale} data-condensed={condensed ? "1" : "0"}>
      {/* Sticky condensed bar (H02) — shown when scrolled on desktop */}
      <div className="jd-desk-sticky" aria-hidden={!condensed}>
        <div className="jd-desk-inner jd-desk-sticky__inner">
          <Link href="/" className="jd-desk-sticky__brand" aria-label={t("masthead.homeAria")}>
            <span className="jd-desk-mark">ज</span>
            <span className="jd-brand jd-desk-sticky__word">{t("brand.name")}</span>
          </Link>
          <nav className="jd-desk-sticky__nav" aria-label={t("nav.aria")}>
            {catItems.slice(0, 7).map((it) => (
              <Link
                key={it.key}
                href={it.href}
                className={active === it.key ? "is-active" : undefined}
                aria-current={active === it.key ? "page" : undefined}
              >
                {locale === "en" ? it.labelEn : it.labelHi}
              </Link>
            ))}
          </nav>
          <div className="jd-desk-sticky__actions">
            <button
              type="button"
              className="jd-desk-icon-btn"
              aria-label={t("masthead.searchAria")}
              onClick={() => setSearchOpen(true)}
            >
              <JdIcon name="search" size={18} stroke={1.9} color="var(--jd-gold-soft)" />
            </button>
            <Link href="/live" className="jd-desk-live-pill">
              Live
            </Link>
            <Link href="/membership" className="jd-desk-member-cta jd-desk-member-cta--sm">
              {t("desk.becomeMember")}
            </Link>
          </div>
        </div>
      </div>

      {/* Full header stack */}
      <div className="jd-desk-full">
        <div className="jd-desk-util">
          <div className="jd-desk-inner jd-desk-util__inner">
            <span className="jd-desk-util__date">{dateLabel}</span>
            <span className="jd-desk-util__wx" title={weather.fetchedAt ?? undefined}>
              <JdIcon
                name={weather.icon}
                size={13}
                stroke={1.8}
                color="var(--jd-gold-soft)"
              />
              {weatherLabel}
            </span>
            <Link href="/district?select=1" className="jd-desk-util__district">
              <JdIcon name="pin" size={12} stroke={2} color="var(--jd-gold)" />
              {districtLabel}
              <JdIcon name="chevD" size={11} stroke={2} color="#8ea0c4" />
            </Link>
            <div className="jd-desk-lang" role="group" aria-label={t("desk.languageAria")}>
              <button
                type="button"
                className={language === "hi" ? "is-active" : undefined}
                onClick={() => setLanguage("hi")}
              >
                हिं
              </button>
              <button
                type="button"
                className={language === "en" ? "is-active" : undefined}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
            </div>
            <Link href="/login" className="jd-desk-util__signin">
              {t("desk.signIn")}
            </Link>
          </div>
        </div>

        <div className="jd-desk-brand">
          <div className="jd-desk-inner jd-desk-brand__inner">
            <button
              type="button"
              className="jd-desk-hamburger"
              aria-label={t("desk.menuAria")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <JdIcon name="list" size={22} stroke={2} color="var(--jd-navy)" />
            </button>

            <Link href="/" className="jd-desk-brand__logo" aria-label={t("masthead.homeAria")}>
              <span className="jd-desk-mark jd-desk-mark--lg">ज</span>
              <span>
                <span className="jd-brand jd-desk-brand__word">{t("brand.name")}</span>
                <span className="jd-desk-brand__tag">{t("desk.tagline")}</span>
              </span>
            </Link>

            <button
              type="button"
              className="jd-desk-search"
              onClick={() => setSearchOpen(true)}
              aria-label={t("masthead.searchAria")}
            >
              <JdIcon name="search" size={16} stroke={1.9} color="var(--jd-ink-3)" />
              <span>{t("search.placeholder")}</span>
            </button>

            <div className="jd-desk-brand__actions">
              <button
                type="button"
                className="jd-desk-icon-btn jd-desk-icon-btn--paper"
                aria-label={t("masthead.searchAria")}
                onClick={() => setSearchOpen(true)}
              >
                <JdIcon name="search" size={20} stroke={1.9} color="var(--jd-navy)" />
              </button>
              <Link
                href="/login"
                className="jd-desk-icon-btn jd-desk-icon-btn--paper"
                aria-label={t("masthead.profileAria")}
              >
                <JdIcon name="user" size={20} stroke={1.9} color="var(--jd-navy)" />
              </Link>
              <Link href="/membership" className="jd-desk-member-cta">
                {t("desk.becomeMember")}
              </Link>
            </div>
          </div>
        </div>

        <nav className="jd-desk-catnav" aria-label={t("desk.catNavAria")}>
          <div className="jd-desk-inner jd-desk-catnav__inner">
            {catItems.map((it) => {
              const compactOnly = !compactKeys.has(it.key);
              return (
                <Link
                  key={it.key}
                  href={it.href}
                  className={[
                    active === it.key ? "is-active" : "",
                    compactOnly ? "jd-desk-cat--wide" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={active === it.key ? "page" : undefined}
                >
                  {locale === "en" ? it.labelEn : it.labelHi}
                </Link>
              );
            })}
            <Link href="/live" className="jd-desk-catnav__live">
              <span className="jd-desk-dot" />
              Live
            </Link>
            <Link href="/listen" className="jd-desk-catnav__audio" aria-label={t("nav.listen")}>
              <JdIcon name="headphone" size={16} stroke={1.9} color="var(--jd-gold-soft)" />
            </Link>
          </div>
        </nav>

        {menuOpen ? (
          <div className="jd-desk-drawer" role="dialog" aria-label={t("desk.menuAria")}>
            {catItems.map((it) => (
              <Link
                key={`drawer-${it.key}`}
                href={it.href}
                onClick={() => setMenuOpen(false)}
                className={active === it.key ? "is-active" : undefined}
              >
                {locale === "en" ? it.labelEn : it.labelHi}
              </Link>
            ))}
            <Link href="/membership" onClick={() => setMenuOpen(false)}>
              {t("desk.becomeMember")}
            </Link>
            <Link href="/archive" onClick={() => setMenuOpen(false)}>
              {t("nav.more")}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
