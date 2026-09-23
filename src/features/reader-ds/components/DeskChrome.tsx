"use client";

import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useJdDsT } from "../i18n";
import { useDeskChromeCondensed } from "../hooks/useDeskChromeCondensed";
import { useDistrictWeather } from "../hooks/useDistrictWeather";
import { JdIcon } from "./icons";
import { UnifiedBrandLockup } from "./UnifiedBrandLockup";
import { DESK_CAT_ITEMS, resolveDeskCatActive } from "./deskCatItems";

/**
 * Desktop / tablet editorial chrome (SoT H01–H04).
 * Mounted from ReaderShell; phone masthead stays for <768 via CSS.
 * Condensed sticky mode uses hysteresis + fixed overlay (no layout collapse).
 */
export function DeskChrome() {
  const { t, locale } = useJdDsT();
  const { language, setLanguage } = useLanguage();
  const { prefs, setSearchOpen, toggleTheme } = useReaderPreferences();
  const pathname = usePathname() || "/";
  const active = resolveDeskCatActive(pathname);
  const districtSlug = prefs.homeDistrict?.trim() || "raipur";
  const weather = useDistrictWeather(districtSlug);
  const condensed = useDeskChromeCondensed();

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

  return (
    <div className="jd-desk-chrome" data-jd-locale={locale} data-condensed={condensed ? "1" : "0"}>
      {/* Sticky condensed bar (H02) — shown when scrolled on desktop */}
      <div className="jd-desk-sticky" aria-hidden={!condensed}>
        <div className="jd-desk-inner jd-desk-sticky__inner">
          <Link href="/" className="jd-desk-sticky__brand" aria-label={t("masthead.homeAria")}>
            <BrandMark size={22} radius={5} />
            <span className="jd-brand jd-desk-sticky__word">
              {locale === "en" ? "JAN DARPAN" : t("brand.name")}
            </span>
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
              <JdIcon name="search" size={18} stroke={1.9} color="rgba(255, 255, 255, 0.75)" />
            </button>
            <Link href="/live" className="jd-desk-live-pill">
              {locale === "en" ? "Live" : "लाइव"}
            </Link>
            <Link href="/membership" className="jd-desk-member-cta jd-desk-member-cta--sm">
              {t("desk.becomeMember")}
            </Link>
          </div>
        </div>
      </div>

      {/* Full header stack — Exactly 2 sections here + Live Ticker below = 3 Sections total */}
      <div className="jd-desk-full">
        {/* SECTION 1 — MAIN MASTHEAD */}
        <div className="jd-desk-masthead jd-desk-brand">
          <div className="jd-desk-inner jd-desk-masthead__inner">
            {/* LEFT: Jan Darpan logo + District selector */}
            <div className="jd-desk-masthead__left">
              <UnifiedBrandLockup tone="light" size="regular" />
            </div>

            {/* CENTER: Intentionally open / minimal */}
            <div className="jd-desk-masthead__center" aria-hidden="true" />

            {/* RIGHT: Date + Weather + Lang + Theme Toggle + Sign In + Member */}
            <div className="jd-desk-masthead__right">
              {/* Date + Weather */}
              <div className="jd-desk-masthead__meta">
                <span className="jd-desk-masthead__date">{dateLabel}</span>
                <span className="jd-desk-masthead__sep" aria-hidden="true">|</span>
                <span className="jd-desk-masthead__wx" title={weather.fetchedAt ?? undefined}>
                  <JdIcon
                    name={weather.icon}
                    size={17}
                    stroke={1.9}
                    color="var(--jd-navy)"
                  />
                  <span>{weatherLabel}</span>
                </span>
              </div>

              {/* Language Switcher */}
              <div className="jd-desk-lang" role="group" aria-label={t("desk.languageAria")}>
                <button
                  type="button"
                  className={language === "hi" ? "is-active" : undefined}
                  onClick={() => setLanguage("hi")}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  className={language === "en" ? "is-active" : undefined}
                  onClick={() => setLanguage("en")}
                >
                  EN
                </button>
              </div>

              {/* Day / Night Mode Toggle */}
              <button
                type="button"
                className="jd-desk-theme-toggle"
                onClick={toggleTheme}
                aria-label={
                  prefs.theme === "dark"
                    ? (locale === "en" ? "Switch to light mode" : "लाइट मोड चुनें")
                    : (locale === "en" ? "Switch to dark mode" : "डार्क मोड चुनें")
                }
                title={
                  prefs.theme === "dark"
                    ? (locale === "en" ? "Light mode" : "लाइट मोड")
                    : (locale === "en" ? "Dark mode" : "डार्क मोड")
                }
              >
                <JdIcon
                  name={prefs.theme === "dark" ? "sun" : "moon"}
                  size={17}
                  stroke={1.9}
                  color="var(--jd-navy)"
                />
              </button>

              {/* Sign In */}
              <Link href="/login" prefetch={false} className="jd-desk-masthead__signin">
                {t("desk.signIn")}
              </Link>

              {/* Member button */}
              <Link href="/membership" prefetch={false} className="jd-desk-member-cta">
                {t("desk.becomeMember")}
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 2 — CATEGORY / DESK NAVIGATION (Full-Width, 13 canonical desks) */}
        <nav className="jd-desk-catnav" aria-label={t("desk.catNavAria")}>
          <div className="jd-desk-inner jd-desk-catnav__inner">
            {catItems.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                prefetch={false}
                className={active === it.key ? "is-active" : undefined}
                aria-current={active === it.key ? "page" : undefined}
              >
                {locale === "en" ? it.labelEn : it.labelHi}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
